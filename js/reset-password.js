/* =========================================
   VOSS KITCHEN
   Password Reset Request
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

	setCurrentYear();

	const form = document.getElementById("reset-form");

	if (!form) {
		return;
	}

	form.addEventListener("submit", handlePasswordReset);

});


async function handlePasswordReset(event) {

	event.preventDefault();

	const email =
		document.getElementById("email").value.trim();

	const button =
		document.getElementById("reset-button");

	const message =
		document.getElementById("reset-message");


	button.disabled = true;
	button.textContent = "Sending...";

	message.textContent = "";
	message.className = "auth-message";


	/*
	 * Send the password reset email.
	 *
	 * The redirect URL is where Supabase will
	 * send the user after they click the link.
	 */
	const { error } =
		await supabaseClient.auth.resetPasswordForEmail(
			email,
			{
				redirectTo:
					"https://voss.kitchen/update-password.html"
			}
		);


	if (error) {

		console.error("Password reset error:", error);

		message.textContent =
			"Unable to send the reset link. Please try again.";

		message.classList.add("error");

		button.disabled = false;
		button.textContent = "Send Reset Link";

		return;
	}


	/*
	 * Always use the same success message regardless
	 * of whether the email exists.
	 *
	 * This prevents revealing which email addresses
	 * have accounts.
	 */
	message.textContent =
		"If an account exists for that email address, a password reset link has been sent. Please check your email.";

	message.classList.add("success");

	button.disabled = false;
	button.textContent = "Send Reset Link";
}
