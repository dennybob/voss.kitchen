/* =========================================
   VOSS KITCHEN
   Account Page
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {

	setCurrentYear();

	const user = await getCurrentUser();

	/*
	 * This page is for logged-in users only.
	 */
	if (!user) {
		window.location.href = "login.html";
		return;
	}


	const profile = await getCurrentProfile();

	if (!profile) {

		const message =
			document.getElementById("account-message");

		message.textContent =
			"Your account information could not be loaded.";

		message.classList.add("error");

		return;
	}


	/*
	 * Display the user's account information.
	 */
	const emailField =
		document.getElementById("account-email");

	const displayNameField =
		document.getElementById("account-display-name");


	if (emailField) {
		emailField.value = user.email || "";
	}


	if (displayNameField) {
		displayNameField.value =
			profile.display_name || "";
	}

});
