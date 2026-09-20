/* =========================================
   VOSS KITCHEN
   Update Password
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {

	setCurrentYear();

	const form =
		document.getElementById("update-password-form");

	if (!form) {
		return;
	}

	/*
	 * The password-reset link establishes an
	 * authenticated Supabase session.
	 *
	 * Make sure that session exists before
	 * allowing a password change.
	 */
	const user = await getCurrentUser();

	if (!user) {

		const message =
			document.getElementById("update-password-message");

		message.textContent =
			"This password reset link is invalid or has expired. Please request a new one.";

		message.classList.add("error");

		return;
	}

	form.addEventListener(
		"submit",
		handlePasswordUpdate
	);

});


async function handlePasswordUpdate(event) {

	event.preventDefault();

	const password =
		document.getElementById("password").value;

	const confirmPassword =
		document.getElementById("confirm-password").value;

	const button =
		document.getElementById("update-password-button");

	const message =
		document.getElementById("update-password-message");


	message.textContent = "";
	message.className = "auth-message";


	/*
	 * Make sure both passwords match.
	 */
	if (password !== confirmPassword) {

		message.textContent =
			"The passwords do not match.";

		message.classList.add("error");

		return;
	}


	/*
	 * Supabase requires a minimum password length.
	 * We also enforce 8 characters in the form.
	 */
	if (password.length < 8) {

		message.textContent =
			"Your password must be at least 8 characters long.";

		message.classList.add("error");

		return;
	}


	button.disabled = true;
	button.textContent = "Updating...";


	const { error } =
		await supabaseClient.auth.updateUser({
			password
		});


	if (error) {

		console.error(
			"Password update error:",
			error
		);

		message.textContent =
			"Unable to update your password. Please try again.";

		message.classList.add("error");

		button.disabled = false;
		button.textContent = "Update Password";

		return;
	}


	/*
	 * Password successfully changed.
	 */
	message.textContent =
		"Your password has been updated successfully.";

	message.classList.add("success");


	/*
	 * Give the user a moment to see the
	 * confirmation before returning to login.
	 */
	setTimeout(() => {

		supabaseClient.auth.signOut();

		window.location.href = "login.html";

	}, 2000);
}
