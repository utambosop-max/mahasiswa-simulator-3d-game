Shader "MS/Berkas Jendela Ultra"
{
    Properties
    {
        _Tint("Warna dan kekuatan", Color) = (1, 0.94, 0.8, 0.15)
    }
    SubShader
    {
        Tags { "RenderPipeline" = "UniversalPipeline" "Queue" = "Transparent-20" "RenderType" = "Transparent" }
        Pass
        {
            Blend SrcAlpha One
            Cull Off
            ZWrite Off

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            CBUFFER_START(UnityPerMaterial)
            half4 _Tint;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                half2 uv : TEXCOORD0;
            };

            Varyings Vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv;
                return output;
            }

            half4 Frag(Varyings input) : SV_Target
            {
                half sisi = smoothstep(0.0, 0.23, min(input.uv.x, 1.0 - input.uv.x));
                half pangkal = smoothstep(0.0, 0.13, input.uv.y);
                half ujung = 1.0 - smoothstep(0.1, 1.0, input.uv.y);
                half teralis = lerp(0.60, 1.0, smoothstep(0.06, 0.18, abs(frac(input.uv.x * 4.0) - 0.5)));
                return half4(_Tint.rgb, _Tint.a * sisi * pangkal * ujung * teralis);
            }
            ENDHLSL
        }
    }
}
