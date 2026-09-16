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
		.select("id, display_name, approved, is_admin")
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

	if (!authLink) {
		return;
	}

	const user = await getCurrentUser();

	if (!user) {
		authLink.textContent = "Log In";
		authLink.href = "login.html";
		authLink.onclick = null;
		return;
	}

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
}


/*
 * Keep the navigation synchronized if the
 * authentication state changes.
 */
supabaseClient.auth.onAuthStateChange(() => {
	updateAuthNavigation();
});
