export function validateUserCreate(body) {
  const { username, email, password } = body;

  if (!username || typeof username !== "string" || username.length < 3) {
    return "Username must be at least 3 characters long!";
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "Invalid email address!";
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long!";
  }

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()-+])[A-Za-z\d!@#$%^&*()-+]{8,}$/;
  if (!passwordRegex.test(password)) {
    return "Password must contain at least one letter, one number and one special character!";
  }

  return null; // no errors
}