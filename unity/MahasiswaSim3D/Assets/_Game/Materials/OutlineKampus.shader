Shader "MS/Outline Kampus"
{
    Properties
    {
        [MainTexture] _BaseMap("Palet", 2D) = "white" {}
        [MainColor] _BaseColor("Warna", Color) = (1,1,1,1)
        _OutlineTint("Warna garis", Color) = (.28,.23,.29,1)
        _OutlineWidth("Lebar garis (meter)", Range(0,.04)) = .012
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry+1" }
        Pass
        {
            Cull Front
            ZWrite Off
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _BaseColor;
                half4 _OutlineTint;
                float _OutlineWidth;
            CBUFFER_END
            struct Input
            {
                float4 positionOS : POSITION;
                half3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };
            struct Output
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };
            Output Vert(Input input)
            {
                UNITY_SETUP_INSTANCE_ID(input);
                Output o;
                float3 posisi = TransformObjectToWorld(input.positionOS.xyz);
                posisi += TransformObjectToWorldNormal(input.normalOS) * _OutlineWidth;
                o.positionCS = TransformWorldToHClip(posisi);
                o.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return o;
            }
            half4 Frag(Output i) : SV_Target
            {
                return half4(SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,i.uv).rgb * _BaseColor.rgb * _OutlineTint.rgb,1);
            }
            ENDHLSL
        }
    }
}
