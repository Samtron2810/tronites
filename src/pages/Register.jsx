import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import AuthHomeLink from "../components/AuthHomeLink";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCalendar,
} from "react-icons/fi";
import { MIN_SIGNUP_AGE } from "../constants/legal";

// ── Validation (mirrors registerSchema in the backend's utils/validators.js;
// the server stays the authority, this just stops bad requests leaving the
// browser — every request that reaches /auth/register counts against the
// auth rate limit, and a request that passes starts the 60-second
// "one code per email" cooldown on the server).
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_STRIP_PATTERN = /[^\p{L}\p{M}' -]/gu;

const pad = (n) => String(n).padStart(2, "0");
const toIsoDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Whole years between a YYYY-MM-DD string and today (local calendar date).
// null = empty or impossible date.
const ageFromIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dob = new Date(y, mo - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== mo - 1 || dob.getDate() !== d) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - y;
  if (
    now.getMonth() < mo - 1 ||
    (now.getMonth() === mo - 1 && now.getDate() < d)
  ) {
    age -= 1;
  }
  return age;
};

const validateName = (label, value) => {
  const v = value.trim();
  if (!v) return `${label} is required.`;
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (v.length > 30) return `${label} must be at most 30 characters.`;
  if (!NAME_PATTERN.test(v)) return `${label} contains invalid characters.`;
  return "";
};

const validate = (data, agreed) => {
  const errors = {};

  const first = validateName("First name", data.firstName);
  if (first) errors.firstName = first;
  const last = validateName("Last name", data.lastName);
  if (last) errors.lastName = last;

  const email = data.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";

  if (!data.dateOfBirth) {
    errors.dateOfBirth = "Date of birth is required.";
  } else {
    const age = ageFromIso(data.dateOfBirth);
    if (age === null || age < 0 || age > 120) {
      errors.dateOfBirth = "Enter a valid date of birth.";
    } else if (age < MIN_SIGNUP_AGE) {
      errors.dateOfBirth = `You must be at least ${MIN_SIGNUP_AGE} to create a Tronites account.`;
    }
  }

  if (!data.password) errors.password = "Password is required.";
  else if (data.password.length < 10)
    errors.password = "Password must be at least 10 characters.";
  else if (data.password.length > 128)
    errors.password = "Password must be at most 128 characters.";

  if (!agreed) errors.agreed = "Please accept the Terms of Use and Privacy Policy.";

  return errors;
};

// A code was just emailed for exactly this form. Reusing it (instead of
// asking the server again) avoids the 60-second cooldown error when someone
// navigates back and presses Create Account a second time.
const REUSE_WINDOW_MS = 4 * 60 * 1000; // OTP lives for 5 minutes
// { fingerprint, challengeId, email, at } of the last successful send. Module
// scope (not a ref) so it survives leaving and re-entering this page.
let lastSend = null;

const inputClass = (hasError, extra = "") =>
  `w-full py-3 rounded-xl border bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:ring-2 transition ${
    hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-100"
      : "border-stroke focus:border-primary-600 focus:ring-primary-100"
  } ${extra}`;

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="text-sm text-red-600 mt-1.5 pl-1">
      {message}
    </p>
  ) : null;

const Register = () => {
  const navigate = useNavigate();
  const { register, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false); // show all errors after first attempt
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
  });

  // Synchronous in-flight guard. `isLoading` is React state, so two clicks
  // landing in the same tick would both see `false` and both send a request.
  const inFlightRef = useRef(false);

  const maxDob = useMemo(() => toIsoDate(new Date()), []);
  const errors = useMemo(() => validate(formData, agreed), [formData, agreed]);
  const showError = (field) => (submitted || touched[field]) && errors[field];

  const markTouched = (field) =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      setFormData({
        ...formData,
        [name]: value.replace(NAME_STRIP_PATTERN, ""),
      });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [loading, user, navigate]);

  const goToVerify = ({ challengeId, email, duplicate }) => {
    // challengeId is an opaque, server-issued, single-use handle — not
    // the email itself, and not a security control on its own. It just
    // lets VerifyOtp know which pending challenge to show without
    // putting an email address in the URL. All real enforcement
    // (attempt limits, expiry, hashed comparison) happens server-side
    // regardless of what's carried here. Router state avoids the URL
    // entirely; sessionStorage is only a fallback so a page refresh
    // (which clears router state) doesn't strand the user.
    sessionStorage.setItem("otp:register:challengeId", challengeId);
    sessionStorage.setItem("otp:register:email", email);
    navigate("/verify-otp", {
      state: { challengeId, email, duplicate },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inFlightRef.current) return;

    // Validate everything first — nothing is sent to the server unless the
    // whole form is valid.
    setSubmitted(true);
    const found = validate(formData, agreed);
    const firstInvalid = [
      "firstName",
      "lastName",
      "email",
      "dateOfBirth",
      "password",
      "agreed",
    ].find((f) => found[f]);
    if (firstInvalid) {
      toast.error(found[firstInvalid]);
      document.getElementById(`reg-${firstInvalid}`)?.focus();
      return;
    }

    const payload = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      acceptTerms: true,
      marketingOptIn,
    };

    // Same form as the code we just sent? Reuse it instead of asking again.
    const fingerprint = JSON.stringify(payload);
    const last = lastSend;
    if (
      last &&
      last.fingerprint === fingerprint &&
      Date.now() - last.at < REUSE_WINDOW_MS
    ) {
      goToVerify({ challengeId: last.challengeId, email: last.email });
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const res = await register(payload);
      toast.success(res.message || "OTP sent to your email");
      lastSend = {
        fingerprint,
        challengeId: res.challengeId,
        email: res.email,
        at: Date.now(),
      };
      goToVerify({
        challengeId: res.challengeId,
        email: res.email,
        duplicate: res._duplicate,
      });
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;
      if (status === 429 && /wait before requesting/i.test(message || "")) {
        toast.error(
          "A code was already sent to this email a moment ago. Check your inbox (and spam), or wait a minute and try again.",
        );
      } else {
        toast.error(message || "Registration failed");
      }
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#0f6e56] flex-col justify-between p-12">
        <Link
          to="/"
          className="inline-flex items-center self-start text-white font-bold text-5xl tracking-tight"
          aria-label="Back to Tronites homepage"
        >
          Tron<span className="text-[#9fe1cb]">ites</span>
        </Link>
        <div>
          <p className="text-[#e1f5ee] text-4xl font-bold leading-tight max-w-xs">
            Your voice. Your community.
          </p>
          <p className="text-[#9fe1cb] mt-4 text-lg leading-relaxed max-w-sm">
            Join thousands already sharing moments, ideas, and conversations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1d9e75]" />
          <div className="w-8 h-8 rounded-full bg-[#9fe1cb]" />
          <div className="w-8 h-8 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <AuthHomeLink />

          <h2 className="text-3xl font-bold text-ink mb-1">Create account</h2>
          <p className="text-ink-muted text-base mb-8">
            Join the community today.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
                  <input
                    id="reg-firstName"
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={() => markTouched("firstName")}
                    maxLength={30}
                    aria-invalid={!!showError("firstName")}
                    aria-describedby="reg-firstName-error"
                    className={inputClass(!!showError("firstName"), "pl-9 pr-4")}
                  />
                </div>
                <FieldError
                  id="reg-firstName-error"
                  message={showError("firstName")}
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  id="reg-lastName"
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={() => markTouched("lastName")}
                  maxLength={30}
                  aria-invalid={!!showError("lastName")}
                  aria-describedby="reg-lastName-error"
                  className={inputClass(!!showError("lastName"), "px-4")}
                />
                <FieldError
                  id="reg-lastName-error"
                  message={showError("lastName")}
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => markTouched("email")}
                  aria-invalid={!!showError("email")}
                  aria-describedby="reg-email-error"
                  className={inputClass(!!showError("email"), "pl-9 pr-4")}
                />
              </div>
              <FieldError id="reg-email-error" message={showError("email")} />
            </div>

            <div>
              <label
                htmlFor="reg-dateOfBirth"
                className="block text-sm font-medium text-ink mb-1.5 pl-1"
              >
                Date of birth
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base pointer-events-none" />
                <input
                  id="reg-dateOfBirth"
                  type="date"
                  name="dateOfBirth"
                  autoComplete="bday"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  onBlur={() => markTouched("dateOfBirth")}
                  min="1900-01-01"
                  max={maxDob}
                  aria-invalid={!!showError("dateOfBirth")}
                  aria-describedby="reg-dateOfBirth-error reg-dateOfBirth-help"
                  className={inputClass(!!showError("dateOfBirth"), "pl-9 pr-4")}
                />
              </div>
              <FieldError
                id="reg-dateOfBirth-error"
                message={showError("dateOfBirth")}
              />
              {!showError("dateOfBirth") && (
                <p
                  id="reg-dateOfBirth-help"
                  className="text-sm text-ink-muted mt-1.5 pl-1"
                >
                  Used only to check you're old enough. It's never shown on your
                  profile.
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => markTouched("password")}
                  maxLength={128}
                  aria-invalid={!!showError("password")}
                  aria-describedby="reg-password-error reg-password-help"
                  className={inputClass(!!showError("password"), "pl-9 pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              <FieldError
                id="reg-password-error"
                message={showError("password")}
              />
              {!showError("password") && (
                <p
                  id="reg-password-help"
                  className="text-sm text-ink-muted mt-1.5 pl-1"
                >
                  At least 10 characters.
                </p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 pl-1 cursor-pointer select-none">
                <input
                  id="reg-agreed"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  aria-invalid={!!(submitted && errors.agreed)}
                  aria-describedby="reg-agreed-error"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stroke accent-primary-600"
                />
                <span className="text-sm text-ink-muted leading-snug">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    target="_blank"
                    rel="noopener"
                    className="text-primary-600 hover:underline"
                  >
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    target="_blank"
                    rel="noopener"
                    className="text-primary-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <FieldError
                id="reg-agreed-error"
                message={submitted ? errors.agreed : ""}
              />
            </div>

            <label className="flex items-start gap-2.5 pl-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-stroke accent-primary-600"
              />
              <span className="text-sm text-ink-muted leading-snug">
                Email me product news and announcements (optional — you can
                unsubscribe any time).
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-base mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary-600 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
