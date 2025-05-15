import { createRemoteJWKSet, jwtVerify } from 'jose';

const TOKEN =
    'eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJjYXRhbHlzdDpzeXN0ZW06and0OmxhdGVzdCIsInN1YiI6Im9yYmlzb3BzL2cuc2FudGlhZ29Ab3JiaXNvcHMuY29tIiwiY2xhaW1zIjpbIjI2OGFiYTg2LTU4YTctNGM5Mi05NTc2LWVkYzFhOWFhYzQ0NCJdLCJhdWQiOiJjYXRhbHlzdDpzeXN0ZW06ZGF0YWNoYW5uZWxzIiwianRpIjoiMzljNGYyOGEtZTAwNS00MTNlLWJiMzgtMzdkMmJmZWVmYjAyIiwibmJmIjoxNzQ3MjA4MDU2LCJpYXQiOjE3NDcyMDgwNTcsImV4cCI6MTc0NzgxMjg1N30.Ti9hFX5R36OMWP_XJtP1p1swCRbFRfrlmpR0Dek_4S9nBzeroNSzJ30QqQlz3jXEJOn3CZrBS_hWb9LhetK6Aw';
const GATEWAY_URL = 'http://localhost:4010/graphql';

(async function main() {
    console.log('GATEWAY_URL: ', GATEWAY_URL);
    const jwtURl = GATEWAY_URL.replace('graphql', '.well-known/jwks.json');
    console.log('jwtURl: ', jwtURl);
    console.log(await (await fetch(jwtURl)).json());
    const JWKS = createRemoteJWKSet(new URL(jwtURl));
    console.log('JWKS: ', JWKS);
    try {
        const { payload, protectedHeader } = await jwtVerify(TOKEN, JWKS);
        console.log('payload: ', payload, protectedHeader);
    } catch (e) {
        console.error('error validating jwt: ', e);
    }
})();
