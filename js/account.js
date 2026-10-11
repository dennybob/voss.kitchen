
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

    /*
     * Load this user's recipes.
     */
    await loadMyRecipes(user, profile);

});


async function loadMyRecipes(user, profile) {

    const container =
        document.getElementById("my-recipes");

    if (!container) {
        return;
    }

    const { data: recipes, error } = await supabaseClient
        .from("recipes")
        .select("id, title, category, created_at, image_url")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

    if (error) {

        console.error(
            "Error loading user's recipes:",
            error
        );

        container.innerHTML = `
            <p>
                Your recipes couldn't be loaded.
                Please refresh the page and try again.
            </p>
        `;

        return;
    }

    /*
     * Show an empty state for new contributors.
     */
    if (!recipes || recipes.length === 0) {

        const canAddRecipes =
            profile.active &&
            (profile.approved || profile.is_admin);

        container.innerHTML = `
            <div class="my-recipes-empty">
                <p>You haven't contributed any recipes yet.</p>

                ${canAddRecipes
                    ? `
                        <a
                            href="add-recipe.html"
                            class="secondary-button"
                        >
                            Add Your First Recipe
                        </a>
                    `
                    : `
                        <p>
                            Once your account is approved,
                            you'll be able to contribute recipes.
                        </p>
                    `
                }
            </div>
        `;

        return;
    }

    /*
     * Only show editing links when the account
     * is active and has permission to manage recipes.
     */
    const canEditRecipes =
        profile.active &&
        (profile.approved || profile.is_admin);

    container.innerHTML = recipes.map(recipe => {

        const recipeUrl =
            `recipe.html?id=${encodeURIComponent(recipe.id)}`;

        const imageHtml = recipe.image_url
            ? `
                <img
                    class="my-recipe-image"
                    src="${escapeAccountHtml(recipe.image_url)}"
                    alt=""
                    loading="lazy"
                    decoding="async"
                >
            `
            : `
                <div
                    class="my-recipe-image my-recipe-image-placeholder"
                    aria-hidden="true"
                ></div>
            `;

        const categoryHtml = recipe.category
            ? `
                <p class="my-recipe-category">
                    ${escapeAccountHtml(recipe.category)}
                </p>
            `
            : "";

        const dateHtml = recipe.created_at
            ? `
                <p class="my-recipe-date">
                    Added ${escapeAccountHtml(
                        new Date(recipe.created_at)
                            .toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            })
                    )}
                </p>
            `
            : "";

        return `
            <article class="my-recipe-item">

                ${imageHtml}

                <div class="my-recipe-info">

                    <h3>
                        <a href="${recipeUrl}">
                            ${escapeAccountHtml(recipe.title)}
                        </a>
                    </h3>

                    ${categoryHtml}
                    ${dateHtml}

                </div>

                <div class="my-recipe-actions">

                    <a
                        href="${recipeUrl}"
                        class="secondary-button"
                    >
                        View
                    </a>

                    ${canEditRecipes
                        ? `
                            <a
                                href="edit-recipe.html?id=${encodeURIComponent(recipe.id)}"
                                class="secondary-button"
                            >
                                Edit
                            </a>
                        `
                        : ""
                    }

                </div>

            </article>
        `;

    }).join("");

}


/*
 * Escape database values before inserting them into HTML.
 */
function escapeAccountHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


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
     * Call the existing secure database function.
     */
    const { error } = await supabaseClient.rpc(
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
