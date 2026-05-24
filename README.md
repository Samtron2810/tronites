remember to add conditional display to the navbar

in backend, utils/generateToken.js remember to set this (secure) true when hosting online:
res.cookie("token", token, {
httpOnly: true,
secure: false, // set true in production (HTTPS)
sameSite: "lax",
maxAge: 7 _ 24 _ 60 _ 60 _ 1000,
});
};

RECOMMENDED FOR PRODUCTION, JUST CHANGE THE WHOLE CODE TO THIS:
res.cookie("token", token, {
httpOnly: true,

secure:
process.env.NODE_ENV === "production",

sameSite:
process.env.NODE_ENV === "production"
? "none"
: "lax",

maxAge: 7 _ 24 _ 60 _ 60 _ 1000,
});

WHEN HOSTING BACKEND ON RENDER, THE ENV WOULDNOT ANYMORE BE NODE_ENV=development
IT WILL BE NODE_ENV=production
WHICH WILL BE INSERTED INTO RENDER ENVIRONMENT DIRECTLY

-
-
-
- check the "getMe" on line 58 in authContext.jsx, it was suggested by git copilot, not in my normal code (it might break my code)
-
-
- ADD THUMBNAIL BESIDE THE ADD POST INPUT BOX

## before hosting, change the baseurl in frontend/src/service/api.js from localhost to a real url

-
-
-
- in postcard.jsx
  old line: setComments([res.data, ...comments]);
  new line (changed to): setComments((prev) => [res.data, ...prev]);

-
-
-
-
-
-
- disable send button when clicked or enter is pressed, so avoid sending duplicate message
