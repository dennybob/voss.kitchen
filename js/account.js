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

		showAccountMessage(
			"Your account information could not be loaded.",
			"error"
		);

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


	/*
	 * Connect the Save Display Name button.
	 */
	const saveButton =
		document.getElementById("save-display-name-button");

	if (saveButton) {

		saveButton.addEventListener(
			"click",
			handleDisplayNameSave
		);

	}

});


async function handleDisplayNameSave() {

	const displayNameField =
		document.getElementById("account-display-name");

	const saveButton =
		document.getElementById("save-display-name-button");


	if (!displayNameField || !saveButton) {
		return;
	}


	const displayName =
		displayNameField.value.trim();


	/*
	 * Don't allow an empty display name.
	 */
	if (!displayName) {

		showAccountMessage(
			"Please enter a display name.",
			"error"
		);

		displayNameField.focus();

		return;
	}


	saveButton.disabled = true;
	saveButton.textContent = "Saving...";


	clearAccountMessage();


	/*
	 * Call the secure database function.
	 */
	const { error } =
		await supabaseClient.rpc(
			"update_my_display_name",
			{
				new_display_name: displayName
			}
		);


	if (error) {

		console.error(
			"Display name update error:",
			error
		);

		showAccountMessage(
			"Unable to save your display name. Please try again.",
			"error"
		);

		saveButton.disabled = false;
		saveButton.textContent = "Save Display Name";

		return;
	}


	showAccountMessage(
		"Your display name has been saved.",
		"success"
	);

	saveButton.disabled = false;
	saveButton.textContent = "Save Display Name";

}


function showAccountMessage(text, type) {

	const message =
		document.getElementById("account-message");

	if (!message) {
		return;
	}

	message.textContent = text;
	message.className = "auth-message";

	if (type) {
		message.classList.add(type);
	}

}


function clearAccountMessage() {

	const message =
		document.getElementById("account-message");

	if (!message) {
		return;
	}

	message.textContent = "";
	message.className = "auth-message";

}