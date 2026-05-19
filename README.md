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
-
- // show password function
  const [showPassword, setShowPassword] = useState(false);


<input
type={showPassword ? "text" : "password"}
placeholder="Password"
className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500"
/>

<label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            Show password
</label>

-
-
-
-
-
-
-
-
-
-
-
-
-
- ***

-
-
-
-
- ======================================================================================================================
  //THIS IS THE OLD HOME.JSX CODE
  import { Link } from "react-router-dom";

const Home = () => {
return (

<div className="min-h-screen bg-orange-400 flex items-center justify-center px-6">
<div className="max-w-2xl text-center">
{/_ Logo _/}
<h1 className="text-6xl md:text-7xl font-extrabold text-gray-900">
Tron<span className="text-blue-500">ites</span>
</h1>
{/* Subtitle */}
        <p className="mt-6 text-lg md:text-xl text-gray-800 leading-relaxed">
          Welcome to the home of nerds. Connect with like-minded individuals,
          share your thoughts, and vibe with the community.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-10 py-4 rounded-lg transition duration-200 shadow-md w-3/4 sm:w-auto"
          >
            Sign Up
          </Link>

          <Link
            to="/login"
            className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-10 py-4 rounded-lg transition duration-200 shadow-md w-3/4 sm:w-auto"
          >
            Login
          </Link>
        </div>
      </div>
    </div>

);
};

export default Home;
