import { fn } from "@storybook/test";

export const cookies = fn().mockResolvedValue({
  get: fn().mockReturnValue(undefined),
  getAll: fn().mockReturnValue([]),
  has: fn().mockReturnValue(false),
});

export const headers = fn().mockReturnValue(new Headers());
