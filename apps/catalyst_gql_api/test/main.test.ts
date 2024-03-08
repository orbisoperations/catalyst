import {describe, it, expect} from 'bun:test';


describe('test', () => {
  it('requests data channels from the api', async () => {
    const result = await fetch(
        "http://localhost:5050/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
            query {
              dataChannels {
                id
                name
                endpoint
              }
            }
          `,
          }),
        });

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({
      data: {
        dataChannels: [{id: "foo"}]
      }
    });
  });

  // it('/db', async () => {
  //   const result = await fetch("http://localhost:5050/db");
  //
  //   expect(result.status).toBe(200);
  //   expect(await result.json()).toEqual({
  //     id: "foo"
  //   });
  // });

});