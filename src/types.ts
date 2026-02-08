/**
 * Broadcast event type
 */
export interface BroadcastEvent {
  /**
   * Event type (e.g., "update", "delete", "create")
   */
  type: string;

  /**
   * Event data (can be any object)
   */
  data: any;

  /**
   * Optional HTML containing one or multiple elements with id
   * Useful for HTMX/Alpine.js that can swap elements
   */
  html?: string;
}

/**
 * Callback called when an event is received
 */
export type BroadcastCallback = (event: BroadcastEvent) => void;

/**
 * Cleanup function to remove a subscription
 */
export type UnsubscribeFunction = () => void;

/**
 * Options for the broadcast plugin
 */
export interface BroadcastPluginOptions {
  /**
   * State name where the BroadcastManager will be injected
   * @default 'broadcast'
   */
  stateName?: string;
}

/**
 * Options for the SSE stream plugin
 */
export interface StreamPluginOptions {
  /**
   * Base path for the SSE route
   * @default '/stream'
   */
  basePath?: string;

  /**
   * Store property name that contains the user
   * @default 'user'
   */
  userStoreName?: string;

  /**
   * User property name that contains the userId
   * @default 'userId'
   */
  userIdField?: string;

  /**
   * Function to extract the userId from context
   * If provided, it will take priority over userStoreName and userIdField
   */
  getUserId?: (context: any) => number | string;

  /**
   * Authentication middleware to be applied before the SSE route
   * If not provided, the route will be public
   */
  authMiddleware?: any;
}
