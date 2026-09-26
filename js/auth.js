/* =========================================
   VOSS KITCHEN
   Authentication
   ========================================= */


async function getCurrentUser() {
	const {
		data: { user }
	} = await supabaseClient.auth.getUser();

	return user;
}


async function getCurrentProfile() {
	const user = await getCurrentUser();

	if (!user) {
		return null;
	}

	const { data, error } = await supabaseClient
		.from("profiles")
		.select("id, display_name, approved, is_admin, active")
		.eq("id", user.id)
		.single();

	if (error) {
		console.error("Error loading profile:", error);
		return null;
	}

	return data;
}


async function updateAuthNavigation() {
	const authLink = document.getElementById("auth-nav-link");
	const addRecipeLink = document.getElementById("add-recipe-nav-link");
	const adminLink = document.getElementById("admin-nav-link");

	if (!authLink) {
		return;
	}

	const user = await getCurrentUser();

	/*
	 * Visitor
	 */
	if (!user) {
		authLink.textContent = "Log In";
		authLink.href = "login.html";
		authLink.onclick = null;

		if (addRecipeLink) {
			addRecipeLink.style.display = "none";
		}

		if (adminLink) {
			adminLink.style.display = "none";
		}

		return;
	}


	const profile = await getCurrentProfile();


	/*
	 * Logged-in user
	 */
	authLink.textContent = "Log Out";
	authLink.href = "#";

	authLink.onclick = async (event) => {
		event.preventDefault();

		const { error } = await supabaseClient.auth.signOut();

		if (error) {
			console.error("Error logging out:", error);
			return;
		}

		window.location.href = "index.html";
	};


	/*
	 * Add Recipe is available only to approved users.
	 */
	if (addRecipeLink) {
		addRecipeLink.style.display =
			profile && profile.approved ? "" : "none";
	}


	/*
	 * Admin dashboard is available only to administrators.
	 */
	if (adminLink) {
		adminLink.style.display =
			profile && profile.is_admin ? "" : "none";
	}
}


/*
 * Keep the navigation synchronized if the
 * authentication state changes.
 */

async function checkActiveAccount() {

	const user = await getCurrentUser();

	if (!user) {
		return true;
	}


	const profile = await getCurrentProfile();

	if (!profile) {
		return true;
	}


	if (!profile.active) {

		await supabaseClient.auth.signOut();

		/*
		 * Don't redirect while already on the login page.
		 */
		if (!window.location.pathname.endsWith("login.html")) {
			window.location.href = "login.html";
		}

		return false;
	}


	return true;
}

supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(async () => {
        const active = await checkActiveAccount();

        if (active) {
            await updateAuthNavigation();
        }
    }, 0);
});