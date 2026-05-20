remember to add conditional display to the navbar

remember to remove the skeleton loading demo, and fix it real time

in backend, remember to set this (secure) true when hosting online:
res.cookie("token", token, {
httpOnly: true,
secure: false, // set true in production (HTTPS)
sameSite: "lax",
maxAge: 7 _ 24 _ 60 _ 60 _ 1000,
});
};

-
-
-
- check the "getMe" on line 58 in authContext.jsx, it was suggested by git copilot, not in my normal code (it might break my code)
-
-
- ADD THUMBNAIL BESIDE THE ADD POST INPUT BOX
