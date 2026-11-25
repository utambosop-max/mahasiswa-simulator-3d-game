Shader "MS/Toon Kampus"
{
    Properties
    {
        [MainTexture] _BaseMap("Palet", 2D) = "white" {}
        [MainColor] _BaseColor("Warna", Color) = (1,1,1,1)
        _ShadowTint("Warna bayang", Color) = (.53,.47,.58,1)
        _RimStrength("Kekuatan rim", Range(0,.3)) = .08
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
        Pass
        {
            Name "Toon"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_instancing
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _BaseColor;
                half4 _ShadowTint;
                half _RimStrength;
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
                float3 positionWS : TEXCOORD0;
                half3 normalWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
            };

            Output Vert(Input input)
            {
                UNITY_SETUP_INSTANCE_ID(input);
                Output o;
                o.positionWS = TransformObjectToWorld(input.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.normalWS = TransformObjectToWorldNormal(input.normalOS);
                o.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return o;
            }

            half4 Frag(Output i) : SV_Target
            {
                Light lampu = GetMainLight(TransformWorldToShadowCoord(i.positionWS));
                half3 normal = normalize(i.normalWS);
                half cahaya = saturate(dot(normal, lampu.direction)) * lampu.shadowAttenuation;
                half pita = step(.23h,cahaya)*.55h + step(.64h,cahaya)*.45h;
                half3 lihat = GetWorldSpaceNormalizeViewDir(i.positionWS);
                half rim = step(.75h, 1 - saturate(dot(normal, lihat))) * _RimStrength;
                half3 dasar = SAMPLE_TEXTURE2D(_BaseMap,sampler_BaseMap,i.uv).rgb * _BaseColor.rgb;
                return half4(dasar * (lerp(_ShadowTint.rgb,lampu.color,pita) + rim),1);
            }
            ENDHLSL
        }
    }
}
