Shader "Mahasiswa/Langit Kampung"
{
    Properties
    {
        _Tex ("Peta langit", Cube) = "grey" {}
        _Tint ("Warna", Color) = (.5,.5,.5,1)
        _Exposure ("Eksposur", Range(0,2)) = .75
        _Malam ("Langit malam", Range(0,1)) = 0
    }
    SubShader
    {
        Tags { "Queue"="Background" "RenderType"="Background" "PreviewType"="Skybox" "RenderPipeline"="UniversalPipeline" }
        Cull Off ZWrite Off
        Pass
        {
            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/EntityLighting.hlsl"

            TEXTURECUBE(_Tex);
            SAMPLER(sampler_Tex);
            CBUFFER_START(UnityPerMaterial)
                float4 _Tex_HDR, _Tint;
                float _Exposure, _Malam;
            CBUFFER_END

            struct Input { float4 positionOS : POSITION; };
            struct Varying { float4 positionCS : SV_POSITION; float3 arah : TEXCOORD0; };

            Varying Vert(Input v)
            {
                Varying o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.arah = v.positionOS.xyz;
                return o;
            }

            float Hash(float2 x)
            {
                return frac(sin(dot(x,float2(12.9898,78.233))) * 43758.5453);
            }

            half4 Frag(Varying i) : SV_Target
            {
                float3 dir = normalize(i.arah);
                half4 src = SAMPLE_TEXTURECUBE(_Tex, sampler_Tex, dir);
                half3 siang = DecodeHDREnvironment(src, _Tex_HDR) * _Tint.rgb * (2 * _Exposure);
                float bagianLangit = saturate(dir.y * .90 + .32);
                half3 gelap = lerp(half3(.045,.058,.104),half3(.009,.017,.046),bagianLangit);
                float2 koordinat = float2(atan2(dir.z,dir.x) * .159154943, asin(dir.y) * .318309886) * float2(184,89);
                float2 sel = floor(koordinat);
                float2 titik = .14 + .72*float2(Hash(sel+23),Hash(sel+11));
                float bintang = step(.966,Hash(sel))*(1-smoothstep(.027,.095,length(frac(koordinat)-titik)));
                bintang *= smoothstep(-.22,.22,dir.y);
                float3 pusatBulan = normalize(float3(-.37,.40,.85));
                float bulan = smoothstep(.9983,.9987,dot(dir,pusatBulan));
                float sabit = 1-smoothstep(.9986,.9989,dot(dir,normalize(pusatBulan+float3(.036,.016,0))));
                gelap += siang*.14 + bintang*.60 + bulan*sabit*half3(.90,.81,.62);
                return half4(lerp(siang,gelap,_Malam),1);
            }
            ENDHLSL
        }
    }
}
