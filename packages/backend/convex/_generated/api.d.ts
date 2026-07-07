/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ads from "../ads.js";
import type * as authTelegram from "../authTelegram.js";
import type * as categories from "../categories.js";
import type * as files from "../files.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as inpay from "../inpay.js";
import type * as listings from "../listings.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as reports from "../reports.js";
import type * as reviews from "../reviews.js";
import type * as saved from "../saved.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as stream from "../stream.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ads: typeof ads;
  authTelegram: typeof authTelegram;
  categories: typeof categories;
  files: typeof files;
  follows: typeof follows;
  http: typeof http;
  inpay: typeof inpay;
  listings: typeof listings;
  messages: typeof messages;
  notifications: typeof notifications;
  payments: typeof payments;
  reports: typeof reports;
  reviews: typeof reviews;
  saved: typeof saved;
  seed: typeof seed;
  settings: typeof settings;
  stats: typeof stats;
  stream: typeof stream;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
