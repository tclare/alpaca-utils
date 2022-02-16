export interface ScheduledMarketFunction {
  time: string;
  code: () => void;
}

/* For now, we'll only support market hours (9:30a-4:00p EST) for the scheduled trading function. */
/* TODO: create a Terraform module that takes (as inputs) a path to the Scheduled trading function
Lambda code, as well as a path to the Websocket code */
