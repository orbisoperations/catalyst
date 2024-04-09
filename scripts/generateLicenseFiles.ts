import packages from "../pnpmls.json"

interface dep {
    name: string
    version: string
    license: string
}

const objs: [string, Object][] = (packages as Object[]).map(e => {
    return [e.name, e]
});

const deps: dep[] = [];

while (objs.length > 0 ){
    const [depname, depobj] = objs.pop()!
    console.log(depname, depobj)
    if ("dependencies" in depobj) {
        const subDeps: [string, object][] = Object.entries(depobj['dependencies'] as object)
        objs.push(...subDeps)
    }

    deps.push({
        name: depname,
        version: ("version" in depobj) ? depobj["version"] as string : "N/A",
        license: ("license" in depobj) ? depobj["license"] as string : "N/A",
    })
}

console.log(deps)
