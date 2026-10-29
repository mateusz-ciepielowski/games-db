import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changePasswordSchema,
  loginSchema,
  password,
  resetPasswordSchema,
  signUpSchema,
} from "../lib/zodSchemas";
const valid = {
  username: "player_one",
  email: "player@example.com",
  password: "Very good password 123!",
  confirmPassword: "Very good password 123!",
};
test("signup normalizes identifiers but preserves password whitespace", () => {
  const result = signUpSchema.parse({
    ...valid,
    username: "  PLAYER_ONE  ",
    email: " PLAYER@EXAMPLE.COM ",
    password: "  password  ",
    confirmPassword: "  password  ",
  });
  assert.equal(result.username, "player_one");
  assert.equal(result.email, "player@example.com");
  assert.equal(result.password, "  password  ");
});
test("server validation rejects mismatching signup passwords", () => {
  const result = signUpSchema.safeParse({
    ...valid,
    confirmPassword: "Something else!",
  });
  assert.equal(result.success, false);
  if (!result.success)
    assert.ok(
      result.error.issues.some((issue) => issue.path[0] === "confirmPassword"),
    );
});
test("bcrypt limit is measured in UTF-8 bytes", () => {
  assert.equal(password.safeParse("a".repeat(72)).success, true);
  assert.equal(password.safeParse("a".repeat(73)).success, false);
  assert.equal(password.safeParse("ą".repeat(36)).success, true);
  assert.equal(password.safeParse("ą".repeat(37)).success, false);
});
test("login allows normalized email and username", () => {
  assert.equal(
    loginSchema.parse({
      identifier: " PLAYER@EXAMPLE.COM ",
      password: valid.password,
    }).identifier,
    "player@example.com",
  );
  assert.equal(
    loginSchema.parse({ identifier: "PLAYER_ONE", password: valid.password })
      .identifier,
    "player_one",
  );
});
test("signup rejects invalid usernames and short passwords", () => {
  assert.equal(
    signUpSchema.safeParse({ ...valid, username: "bad/name" }).success,
    false,
  );
  assert.equal(
    signUpSchema.safeParse({
      ...valid,
      password: "123",
      confirmPassword: "123",
    }).success,
    false,
  );
});
test("reset requires UUID token and matching passwords", () => {
  const token = "978a51ca-6f4b-4ec3-a1d1-1734d3cbfb5e";
  assert.equal(
    resetPasswordSchema.safeParse({
      token,
      password: valid.password,
      confirmPassword: valid.password,
    }).success,
    true,
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      token: "invalid",
      password: valid.password,
      confirmPassword: valid.password,
    }).success,
    false,
  );
  assert.equal(
    resetPasswordSchema.safeParse({
      token,
      password: valid.password,
      confirmPassword: "Different password",
    }).success,
    false,
  );
});
test("password change rejects reuse of the current password", () => {
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: valid.password,
      password: valid.password,
      confirmPassword: valid.password,
    }).success,
    false,
  );
});
