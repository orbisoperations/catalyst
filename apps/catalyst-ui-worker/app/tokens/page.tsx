"use client";
import APIKeysComponent from "@/components/tokens/ListTokens";
import { listIJWTRegistry } from "@/app/actions/i-jwt-registry";


export default function TokensListPage() {
  return <APIKeysComponent listIJWTRegistry={listIJWTRegistry} />;
}
