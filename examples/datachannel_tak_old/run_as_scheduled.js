async function main() {
    const schedule = "* * * * *";

    const attemptToStart = await fetch(`http://localhost:4004/__scheduled?cron=${encodeURIComponent(schedule)}`, {
        method: "GET"
    })

    console.log({attemptToStart: await attemptToStart.text()});


//         #Testing scheduled() handlers in local development
//     #You can test the behavior of your scheduled() handler in local development using Wrangler.
// #
//     #Cron Triggers can be tested using Wrangler by passing in the --test-scheduled flag to wrangler dev. This will expose a /__scheduled route which can be used to test using a http request. To simulate different cron patterns, a cron query parameter can be passed in.
//
//     let everyMinuteCron = "* * * * *";
//     curl "")
}

main()