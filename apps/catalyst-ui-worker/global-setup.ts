import childProcess from 'node:child_process';
import path from 'node:path';
// Global setup runs inside Node.js, not `workerd`
export default function () {
    // Build `api-service`'s dependencies

    let label = 'Compiled issued_jwt_registry';
    console.time(label);
    childProcess.execSync('pnpm wrangler deploy --dry-run --outdir dist ', {
        cwd: path.join('../issued-jwt-registry'),
    });
    console.timeEnd(label);

    label = 'Compiled data_channel_registrar';
    console.time(label);
    childProcess.execSync('pnpm build', {
        cwd: path.join('../data_channel_registrar'),
    });
    console.timeEnd(label);

    label = 'Compiled authx_service';
    console.time(label);
    childProcess.execSync('pnpm build', {
        cwd: path.join('../authx_token_api'),
    });
    console.timeEnd(label);

    // build org matchmaking
    label = 'Compiled organization_matchmaking';
    console.time(label);
    childProcess.execSync('pnpm wrangler deploy --dry-run --outdir dist ', {
        cwd: path.join('../organization_matchmaking'),
    });
    console.timeEnd(label);

    label = 'Compiled authx_authzed_api';
    console.time(label);
    childProcess.execSync('pnpm build', {
        cwd: path.join('../authx_authzed_api'),
    });
    console.timeEnd(label);

    label = 'Compiled user-credentials-cache';
    console.time(label);
    childProcess.execSync('pnpm wrangler deploy --dry-run --outdir dist ', {
        cwd: path.join('../user-credentials-cache'),
    });
    console.timeEnd(label);
}
