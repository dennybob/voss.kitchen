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
    const accountLink = document.getElementById("account-nav-link");
    const addRecipeLink = document.getElementById("add-recipe-nav-link");
    const adminLink = document.getElementById("admin-nav-link");

    if (!authLink) {
        return;
    }

    const user = await getCurrentUser();

    // Default to hidden for links requiring authentication.
    if (accountLink) accountLink.style.display = "none";
    if (addRecipeLink) addRecipeLink.style.display = "none";
    if (adminLink) adminLink.style.display = "none";

    if (!user) {
        authLink.textContent = "Log In";
        authLink.href = "login.html";
        authLink.onclick = null;
    } else {
        const profile = await getCurrentProfile();

        authLink.textContent = "Log Out";
        authLink.href = "#";

        if (accountLink) {
            accountLink.style.display = "";
            accountLink.href = "account.html";
        }

        if (addRecipeLink && profile?.approved) {
            addRecipeLink.style.display = "";
        }

        if (adminLink && profile?.is_admin) {
            adminLink.style.display = "";
        }

        authLink.onclick = async (event) => {
            event.preventDefault();

            authLink.style.pointerEvents = "none";

            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                console.error("Error logging out:", error);
                authLink.style.pointerEvents = "";
                return;
            }

            window.location.href = "index.html";
        };
    }

    setActiveNavigation();
}


/*
 * Highlight the current section automatically.
 */
function setActiveNavigation() {
    const page = window.location.pathname.split("/").pop() || "index.html";

    let activeHref = null;

    if (page === "about.html") {
        activeHref = "about.html";
    } else if (page === "account.html") {
        activeHref = "account.html";
    } else if (page === "admin.html") {
        activeHref = "admin.html";
    } else if (
        ["login.html", "reset-password.html",
         "update-password.html"].includes(page)
    ) {
        activeHref = "login.html";
    } else if (page === "change-password.html") {
        activeHref = "account.html";
    } else if (
        ["index.html", "recipe.html",
         "add-recipe.html", "edit-recipe.html"].includes(page)
    ) {
        activeHref = "index.html";
    }

    document.querySelectorAll(".main-nav .nav-link").forEach(link => {
        const isActive = link.getAttribute("href") === activeHref;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });
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