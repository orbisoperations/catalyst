import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const apiKey = "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJjYXRhbHlzdDpzeXN0ZW06and0OmxhdGVzdCIsInN1YiI6Im9yYmlzb3BzL2oucm9kcmlndWV6QG9yYmlzb3BzLmNvbSIsImNsYWltcyI6WyJhZTgzMGYzYS03YWViLTQyNmYtYWU4OS0xYjM4Y2IyYTNkYmUiXSwiYXVkIjoiY2F0YWx5c3Q6c3lzdGVtOmRhdGFjaGFubmVscyIsImp0aSI6ImFmNDdlMmIyLTFhZDgtNDE0MS04MmQ3LWU0NGNjOTkxMmNkNCIsIm5iZiI6MTcxNTAzMDM4NSwiaWF0IjoxNzE1MDMwMzg1LCJleHAiOjE3MTU2MzUxODV9.hNUdY2kd-UD65ZQG3_J0RN5uhNOdmWe25RqrO7nGrTs5WRAdUQKH2GeUPh5pbTK3X7J0_pbpBtPuz1u1sKnKBw";
    const url = "https://gateway.catalyst.devintelops.io/graphql";
    // fetch gateway status
    const body = JSON.stringify({
      query: `
        query MyQuery {
          aircraftWithinDistance(dist: 1.5, lat: 1.5, lon: 1.5) {
            lat
            lon
          }
        }
      `,
    });

    // const resp = await fetch(url, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${apiKey}`,
    //   },
    //   body,
    // })
    //   .then((res) => {
    //     try {

    //         return res.text()
    //     } catch {
    //         return res.text();
    //     }
    // })
    //   .then((data) => {
    //     console.log(data);
    //     return data;
    //   });
    // console.log(request.json())
    const resp = await request.text()
    console.log(resp)
    return NextResponse.json({resp})
}
