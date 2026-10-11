// PATCH /api/users/me  { name?, customInstructions? }
export async function updateMe(req, res) {
  req.user.set(req.validated.body);
  await req.user.save();
  res.json({ user: req.user });
}
