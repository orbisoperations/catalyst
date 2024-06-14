CATALYST
=========

Catalyst is a federate data grid that facilitates sharing between organizations, teams, and products through the use of standard, open source, secure, and tested technology.

Catalyst was borne through the realization that many excellent data exchange platforms exist but they all require some level of onboarding into their platform. We wanted to build something that could achieve internet scale without having to be tied to a certain cloud provider, certain type of data storage, or any system where you lose custody of your data to make it "accessible".

## What is a Federated Data Grid

Federated Data Grid is our `fetch`. It is an opinionated collection of patterns to formalize data formats, data access, access control, and edge accessibility.

While `fetch` never took off, we are hoping that our design tennets do. The are:

* secure
* industry standard and  open protocols
* interoperability across systems, databases, and tech organizations
* open source
* internet scale


To achieve this we use:

* GraphQL - A felxible, well understood, data schema and API pattern
* GraphQL Stitching - We can create a single endpoint to access all data without having to move the data
* Cloudflare Workers - We write code designed to be ditributed running all over the world at once
* Zanzibar - RelBAC to make real time data sharing secure
* Asymmetric JWTs - Create secrets at the core and validate at the edge

## How Does a the Federated Data Grid Work

Catalyst is a stack of tightly coupled technologies that can be deployed on any plaform. Catalyst provides:

* providing patterns for exposing local data sets and work loads to (logically) central place
* identity and access control patterns that are used across the platform
* providing technology anyone can deploy


Catalyst is an Organization based platform. Organizations own and share data and user, data custodian, and org admins are roles users within an org can have.

Users can create API keys which are given to applications (UI or server-side) to access data within Catalyst.

Data Custodians are Users who can also enroll new data endpoints (data channels), initiate or accept shared between orgs, and control which data channels can be accessed by which partered orgs.

Admins are Users who can also add roles (admin, data custodian) to users and invite new users to their orgs.

Catalyst works by having a (logically) central gateway and identity/access control stack that is operated by a trusted entity (the hub). 

Organizations are enrolled by the Catalyst operator and once onboarded org admins have complete control of their org which includes provisioning new data channels and minting API keys.

With an API key, users can then enroll their own services to be able to access data channels within Catalyst.

When setting up a data channel, a data custodian runs through the connection setup, then the data channel can be enabled and shared with other organizations.



## DEPLOYMENT

Catalyst is developed and deployed using Cloudflare Workers with Durable Objects and a Cloudflare Pages project using Nextjs.

### General Deployment Arrangement
Each Orbis customer who has purchased Catalyst will have their own instance of Catalyst deployed on the Cloudflare platform.
Orbis will treat itself as a customer and have its own instance of Catalyst deployed on the Cloudflare platform in the same way a customer would.

Due to the limitations of the Cloudflare Pages platform, the deployment of Catalyst is limited to two environments:
`staging` and `production` (Actually termed `preview` and `production` in the Cloudflare Pages platform, respectively).

The `staging` environment is used for testing and acceptance purposes. `staging` instances will be subdomained to the
`demointelops.io` domain.  In the case of the Orbis customer, the `staging` instance will be subdomained as
`orbis.demointelops.io`.

The `production` environment is used for the live deployment of Catalyst. `production` instances will be subdomained to
the `intelops.io` domain. In the case of the Orbis customer, the `production` instance will be subdomained as
`orbis.intelops.io`.

### Deployment Process
***To deploy Catalyst to `staging` you will need:***
* Access to the Catalyst Cloudflare account - https://dash.cloudflare.com/3be6f7bb0cc73869d555e1156586c1f2
* Access to the Catalyst Github repository - https://github.com/orbisoperations/catalyst

1. Checkout a new branch from the `staging` branch.
2. Make your changes.
3. Push your changes to the repository.
4. Create a pull request to merge your branch into the `staging` branch.
5. Once the pull request is approved and merged, the changes will be automatically deployed to the `staging` environment
   for the routes defined in the `wrangler.toml` file.
6. Test your changes on the `staging` environment at the subdomain `orbis.demointelops.io`.(or `customer.demointelops.io`)

***To deploy Catalyst to `production` you will need:***
* Access to the Catalyst Cloudflare account - https://dash.cloudflare.com/3be6f7bb0cc73869d555e1156586c1f2
* Access to the Catalyst Github repository - https://github.com/orbisoperations/catalyst

7. Perform steps 1-6 for the `staging` environment deployment as stated above.
8. Login to the Github repository and navigate to the `Actions` tab. Select the `Deploy to Production` workflow.
9. Use the `Run workflow` button to trigger the workflow.
10. Test your changes on the `production` environment at the subdomain `orbis.intelops.io`.(or `customer.intelops.io`)
