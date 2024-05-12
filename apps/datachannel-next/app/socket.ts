"use client";
/*
  This file makes socket-io work. The socket-io server is in the run.ts file at the root of this repository.

  Note: We need socket-io for a couple of reasons:
  1. Next 14 app router does not natively support graphql-yoga graphql subscriptions
  2. It's awesome
 */
import { io } from "socket.io-client";

export const socket = io({
  //   connection options
});