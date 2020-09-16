export async function genNumAsync() {
  await new Promise((resolve) => setTimeout(resolve));

  return Math.random();
}

/** DEAD FUNC */
export async function genNumSync() {
  await new Promise((resolve) => setTimeout(resolve));

  return Math.random();
}
