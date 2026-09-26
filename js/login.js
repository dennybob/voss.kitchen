/* =========================================
   VOSS KITCHEN
   Login
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {

	setCurrentYear();

	const form = document.getElementById("login-form");

	if (!form) {
		return;
	}

	const user = await getCurrentUser();

	if (user) {
		window.location.href = "index.html";
		return;
	}

	form.addEventListener("submit", handleLogin);

});


async function handleLogin(event) {

	event.preventDefault();

	const form = event.currentTarget;

	const email =
		document.getElementById("email").value.trim();

	const password =
		document.getElementById("password").value;

	const button =
		document.getElementById("login-button");

	const message =
		document.getElementById("login-message");


	button.disabled = true;
	button.textContent = "Logging in...";

	message.textContent = "";
	message.className = "auth-message";


	const { data, error } =
		await supabaseClient.auth.signInWithPassword({
			email,
			password
		});


	if (error) {

		console.error("Login error:", error);

		message.textContent =
			"Unable to log in. Please check your email and password.";

		message.classList.add("error");

		button.disabled = false;
		button.textContent = "Log In";

		return;
	}


	const profile = await getCurrentProfile();


	if (!profile) {

		message.textContent =
			"Your account could not be loaded. Please contact the site administrator.";

		message.classList.add("error");

		await supabaseClient.auth.signOut();

		button.disabled = false;
		button.textContent = "Log In";

		return;
	}


	/*
	 * Deactivated accounts cannot access the website.
	 */
	if (!profile.active) {

		message.textContent =
			"Your account has been deactivated. Please contact the site administrator.";

		message.classList.add("error");

		await supabaseClient.auth.signOut();

		button.disabled = false;
		button.textContent = "Log In";

		return;
	}


	if (!profile.approved) {

		message.textContent =
			"Your account is waiting for approval. You can log in once your account has been approved.";

		message.classList.add("pending");

		return;
	}


	window.location.href = "index.html";
}
