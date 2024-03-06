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