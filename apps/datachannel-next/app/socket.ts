"use client";
/*
  This file makes socket-io work. The socket-io server is in the run.ts file at the root of this repository.

  Note: We need socket-io for a couple of reasons:
  1. NextJS v14 app router does not natively support graphql-yoga graphql subscriptions.
 */


import { io } from "socket.io-client";

export const socket = io();