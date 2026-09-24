#include <node_api.h>

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

// Only JPEG arrives here (Scryfall's formats), and images come from memory, not files.
#define STBI_ONLY_JPEG
#define STBI_NO_STDIO
#define STB_IMAGE_IMPLEMENTATION
#include "vendor/stb_image.h"

// clang-format off
#define NAPI_OK(call) do { if ((call) != napi_ok) return NULL; } while (0)
// clang-format on

/* Scryfall's largest images are about 1.5 megapixels; anything far beyond that is refused. */
#define MAX_PIXELS (64 * 1024 * 1024)
#define MAX_SAMPLE 256

static napi_value
fail(napi_env env, const char* message)
{
    napi_throw_error(env, NULL, message);
    return NULL;
}

/*
 * Box-averages an RGBA image down to out_width x out_height, so every source pixel
 * counts once. The caller picks the proportions: square for the palette, the
 * image's own for the preview.
 */
static void
downsample(const uint8_t* rgba, int width, int height, int out_width, int out_height, uint8_t* out)
{
    int y;
    for( y = 0; y < out_height; y++ )
    {
        int top = (int)((int64_t)y * height / out_height);
        int bottom = (int)((int64_t)(y + 1) * height / out_height);
        if( bottom <= top )
            bottom = top + 1;
        int x;
        for( x = 0; x < out_width; x++ )
        {
            int left = (int)((int64_t)x * width / out_width);
            int right = (int)((int64_t)(x + 1) * width / out_width);
            if( right <= left )
                right = left + 1;
            uint64_t sum[4] = { 0, 0, 0, 0 };
            int row;
            for( row = top; row < bottom; row++ )
            {
                const uint8_t* pixel = rgba + ((size_t)row * width + left) * 4;
                int column;
                for( column = left; column < right; column++, pixel += 4 )
                {
                    sum[0] += pixel[0];
                    sum[1] += pixel[1];
                    sum[2] += pixel[2];
                    sum[3] += pixel[3];
                }
            }
            uint64_t count = (uint64_t)(bottom - top) * (uint64_t)(right - left);
            uint8_t* target = out + ((size_t)y * out_width + x) * 4;
            int channel;
            for( channel = 0; channel < 4; channel++ )
                target[channel] = (uint8_t)((sum[channel] + count / 2) / count);
        }
    }
}

/* Reads a JPEG's size from its header without decoding it. */
static int
read_info(napi_env env, napi_value value, void** data, size_t* length, int* width, int* height)
{
    bool is_buffer = false;
    if( napi_is_buffer(env, value, &is_buffer) != napi_ok || !is_buffer )
    {
        fail(env, "expected a Buffer");
        return 0;
    }
    if( napi_get_buffer_info(env, value, data, length) != napi_ok )
        return 0;
    if( *length > INT32_MAX )
    {
        fail(env, "image is too large");
        return 0;
    }
    int channels;
    if( !stbi_info_from_memory(*data, (int)*length, width, height, &channels) )
    {
        fail(env, "not a decodable JPEG");
        return 0;
    }
    if( *width < 1 || *height < 1 || (int64_t)*width * *height > MAX_PIXELS )
    {
        fail(env, "image dimensions are out of range");
        return 0;
    }
    return 1;
}

/* info(jpeg: Buffer) -> { width, height } */
static napi_value
info(napi_env env, napi_callback_info callback)
{
    size_t argc = 1;
    napi_value argv[1];
    NAPI_OK(napi_get_cb_info(env, callback, &argc, argv, NULL, NULL));
    if( argc != 1 )
        return fail(env, "info expects a Buffer");
    void* data;
    size_t length;
    int width, height;
    if( !read_info(env, argv[0], &data, &length, &width, &height) )
        return NULL;
    napi_value result, value;
    NAPI_OK(napi_create_object(env, &result));
    NAPI_OK(napi_create_int32(env, width, &value));
    NAPI_OK(napi_set_named_property(env, result, "width", value));
    NAPI_OK(napi_create_int32(env, height, &value));
    NAPI_OK(napi_set_named_property(env, result, "height", value));
    return result;
}

/*
 * sample(jpeg: Buffer, sizes: Array<[width, height]>) -> Buffer[]
 * Decodes once and box-averages the image down to each size, as RGBA.
 */
static napi_value
sample(napi_env env, napi_callback_info callback)
{
    size_t argc = 2;
    napi_value argv[2];
    NAPI_OK(napi_get_cb_info(env, callback, &argc, argv, NULL, NULL));
    bool is_array = false;
    if( argc != 2 || napi_is_array(env, argv[1], &is_array) != napi_ok || !is_array )
        return fail(env, "sample expects a Buffer and an array of [width, height] sizes");
    void* data;
    size_t length;
    int width, height, channels;
    if( !read_info(env, argv[0], &data, &length, &width, &height) )
        return NULL;
    uint32_t count;
    NAPI_OK(napi_get_array_length(env, argv[1], &count));
    if( count < 1 || count > 8 )
        return fail(env, "sample takes between 1 and 8 sizes");
    int32_t sizes[8][2];
    uint32_t i;
    for( i = 0; i < count; i++ )
    {
        napi_value pair, dimension;
        bool pair_is_array = false;
        uint32_t pair_length;
        NAPI_OK(napi_get_element(env, argv[1], i, &pair));
        if( napi_is_array(env, pair, &pair_is_array) != napi_ok || !pair_is_array ||
            napi_get_array_length(env, pair, &pair_length) != napi_ok || pair_length != 2 )
            return fail(env, "each size is [width, height]");
        int axis;
        for( axis = 0; axis < 2; axis++ )
        {
            NAPI_OK(napi_get_element(env, pair, axis, &dimension));
            if( napi_get_value_int32(env, dimension, &sizes[i][axis]) != napi_ok ||
                sizes[i][axis] < 1 || sizes[i][axis] > MAX_SAMPLE )
                return fail(env, "sample sizes must be between 1 and 256");
        }
    }

    uint8_t* rgba = stbi_load_from_memory(data, (int)length, &width, &height, &channels, 4);
    if( !rgba )
        return fail(env, "not a decodable JPEG");
    napi_value result;
    if( napi_create_array_with_length(env, count, &result) != napi_ok )
    {
        stbi_image_free(rgba);
        return NULL;
    }
    for( i = 0; i < count; i++ )
    {
        void* pixels;
        napi_value buffer;
        if( napi_create_buffer(env, (size_t)sizes[i][0] * sizes[i][1] * 4, &pixels, &buffer) != napi_ok ||
            napi_set_element(env, result, i, buffer) != napi_ok )
        {
            stbi_image_free(rgba);
            return NULL;
        }
        downsample(rgba, width, height, sizes[i][0], sizes[i][1], pixels);
    }
    stbi_image_free(rgba);
    return result;
}

static napi_value
init(napi_env env, napi_value exports)
{
    napi_value function;
    NAPI_OK(napi_create_function(env, "info", NAPI_AUTO_LENGTH, info, NULL, &function));
    NAPI_OK(napi_set_named_property(env, exports, "info", function));
    NAPI_OK(napi_create_function(env, "sample", NAPI_AUTO_LENGTH, sample, NULL, &function));
    NAPI_OK(napi_set_named_property(env, exports, "sample", function));
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
