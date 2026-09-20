/* =========================================
   VOSS KITCHEN
   Change Password
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {

	setCurrentYear();

	const form =
		document.getElementById("change-password-form");

	if (!form) {
		return;
	}


	/*
	 * This page requires an authenticated user.
	 */
	const user = await getCurrentUser();

	if (!user) {
		window.location.href = "login.html";
		return;
	}


	form.addEventListener(
		"submit",
		handlePasswordChange
	);

});


async function handlePasswordChange(event) {

	event.preventDefault();

	const password =
		document.getElementById("password").value;

	const confirmPassword =
		document.getElementById("confirm-password").value;

	const button =
		document.getElementById("change-password-button");

	const message =
		document.getElementById("change-password-message");


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
	 * Enforce the same minimum password length
	 * used by the password-reset page.
	 */
	if (password.length < 8) {

		message.textContent =
			"Your password must be at least 8 characters long.";

		message.classList.add("error");

		return;
	}


	button.disabled = true;
	button.textContent = "Changing...";


	const { error } =
		await supabaseClient.auth.updateUser({
			password
		});


	if (error) {

		console.error(
			"Password change error:",
			error
		);

		message.textContent =
			"Unable to change your password. Please try again.";

		message.classList.add("error");

		button.disabled = false;
		button.textContent = "Change Password";

		return;
	}


	/*
	 * Password successfully changed.
	 */
	message.textContent =
		"Your password has been changed successfully.";

	message.classList.add("success");


	/*
	 * Return to the Account page after a short
	 * delay so the user can see the confirmation.
	 */
	setTimeout(() => {

		window.location.href = "account.html";

	}, 2000);

}
