const SUPABASE_URL = "https://stozhfrjxmrsteppwbvy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_dWw9OpeLA4Fg8zzOF6A8qg_qKTddtZc";

const supabaseClient = window.supabase.createClient(
	SUPABASE_URL,
	SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
	setCurrentYear();

	currentUser = await getCurrentUser();
	currentProfile = await getCurrentProfile();

	loadRecipe();
});

function setCurrentYear() {
	const yearElement = document.getElementById("current-year");

	if (yearElement) {
		yearElement.textContent = new Date().getFullYear();
	}
}

async function loadRecipe() {
	const recipeId = getRecipeIdFromUrl();

	if (!recipeId) {
		displayRecipeError(
			"No recipe was selected.",
			"Please return to the recipes page and choose a recipe."
		);
		return;
	}

	const { data: recipe, error } = await supabaseClient
		.from("recipes")
		.select("*")
		.eq("id", recipeId)
		.single();

	if (error || !recipe) {
		console.error("Error loading recipe:", error);

		displayRecipeError(
			"Recipe not found.",
			"This recipe may have been removed or the link may be incorrect."
		);

		return;
	}

	displayRecipe(recipe);
}

function getRecipeIdFromUrl() {
	const params = new URLSearchParams(window.location.search);
	return params.get("id");
}

function displayRecipe(recipe) {
	const container = document.getElementById("recipe-detail");

	if (!container) {
		return;
	}

	document.title = `${recipe.title} | Voss Kitchen`;

	const category = recipe.category || "Recipe";
	const description = recipe.description || "";

	const imageHtml = recipe.image_url
		? `
            <div class="recipe-detail-image">
                <img
                    src="${escapeHtml(recipe.image_url)}"
                    alt="${escapeHtml(recipe.title)}"
                    loading="lazy"
                    decoding="async"
                >
            </div>
          `
		: "";

	const metadataItems = [];

	if (recipe.servings !== null && recipe.servings !== undefined) {
		metadataItems.push(`
            <div class="recipe-meta-item">
                <span class="recipe-meta-label">Servings</span>
                <span class="recipe-meta-value">
                    ${escapeHtml(recipe.servings)}
                </span>
            </div>
        `);
	}

	if (recipe.prep_time !== null && recipe.prep_time !== undefined) {
		metadataItems.push(`
            <div class="recipe-meta-item">
                <span class="recipe-meta-label">Prep time</span>
                <span class="recipe-meta-value">
                    ${escapeHtml(recipe.prep_time)} min
                </span>
            </div>
        `);
	}

	if (recipe.cook_time !== null && recipe.cook_time !== undefined) {
		metadataItems.push(`
            <div class="recipe-meta-item">
                <span class="recipe-meta-label">Cook time</span>
                <span class="recipe-meta-value">
                    ${escapeHtml(recipe.cook_time)} min
                </span>
            </div>
        `);
	}

	const ingredients = Array.isArray(recipe.ingredients)
		? recipe.ingredients
		: [];

	const ingredientsHtml = ingredients.length > 0
		? `
            <ul class="ingredients-list">
                ${ingredients.map(ingredient => `
                    <li>
                        ${formatIngredient(ingredient)}
                    </li>
                `).join("")}
            </ul>
          `
		: `
            <p class="recipe-placeholder">
                No ingredients have been added yet.
            </p>
          `;

	const instructionsHtml = formatInstructions(recipe.instructions);

	const notesHtml = recipe.notes
		? `
            <section class="recipe-notes">
                <h2>Notes</h2>
                <div class="recipe-notes-text">
                    ${formatMultilineText(recipe.notes)}
                </div>
            </section>
          `
		: "";

	const canManageRecipe =
    	currentProfile &&
    	currentProfile.active &&
    	(
    	    currentProfile.is_admin ||
    	    (
    	        currentProfile.approved &&
    	        currentUser &&
    	        recipe.created_by === currentUser.id
    	    )
    	);

	const actionsHtml = `
            <div class="recipe-actions">

                <button
                    type="button"
                    id="print-recipe-button"
                    class="secondary-button"
                >
                    Print Recipe
                </button>

                ${canManageRecipe
			? `
                        <a
                            href="edit-recipe.html?id=${encodeURIComponent(recipe.id)}"
                            class="secondary-button"
                        >
                            Edit Recipe
                        </a>

                        <button
                            type="button"
                            id="delete-recipe-button"
                            class="danger-button"
                        >
                            Delete Recipe
                        </button>
                      `
			: ""
		}

            </div>
          `;

	container.innerHTML = `
    <article class="recipe-detail">

        <div class="recipe-detail-hero">

            ${imageHtml}

            <div class="recipe-detail-content">

                <div class="recipe-detail-header">

                    <p class="eyebrow">
                        ${escapeHtml(category)}
                    </p>

                    <h1 class="recipe-detail-title">
                        ${escapeHtml(recipe.title)}
                    </h1>

                    ${description
			? `
                                <p class="recipe-detail-description">
                                    ${escapeHtml(description)}
                                </p>
                              `
			: ""
		}

                </div>

                ${metadataItems.length > 0
			? `
                            <div class="recipe-meta">
                                ${metadataItems.join("")}
                            </div>
                          `
			: ""
		}

                ${actionsHtml}

            </div>

        </div>

        <div class="recipe-columns">

            <section class="recipe-ingredients">
                <h2>Ingredients</h2>
                ${ingredientsHtml}
            </section>

            <section class="recipe-instructions">
                <h2>Instructions</h2>
                <div class="instructions-text">
                    ${instructionsHtml}
                </div>
            </section>

        </div>

        ${notesHtml}

    </article>
`;

	const printButton = document.getElementById("print-recipe-button");

	if (printButton) {
		printButton.addEventListener("click", () => {
			window.print();
		});
	}

	if (canManageRecipe) {
		document
			.getElementById("delete-recipe-button")
			.addEventListener("click", () => {
				deleteRecipe(recipe);
			});
	}
}

async function deleteRecipe(recipe) {
	const confirmed = window.confirm(
		`Are you sure you want to delete "${recipe.title}"?\n\nThis action cannot be undone.`
	);

	if (!confirmed) {
		return;
	}

	const button = document.getElementById("delete-recipe-button");

	if (button) {
		button.disabled = true;
		button.textContent = "Deleting...";
	}

	/*
	 * Delete the recipe record first.
	 */
	const { error: deleteError } = await supabaseClient
		.from("recipes")
		.delete()
		.eq("id", recipe.id);

	if (deleteError) {
		console.error("Error deleting recipe:", deleteError);

		if (button) {
			button.disabled = false;
			button.textContent = "Delete Recipe";
		}

		alert("Unable to delete this recipe. Please try again.");
		return;
	}

	/*
	 * If the recipe had an image, remove it from Storage.
	 *
	 * The database record is already gone at this point, so
	 * failure here cannot leave the recipe itself in a bad state.
	 */
	if (recipe.image_url) {
		const imagePath = getRecipeImagePath(recipe.image_url);

		if (imagePath) {
			const { error: storageError } = await supabaseClient
				.storage
				.from("recipe-images")
				.remove([imagePath]);

			if (storageError) {
				console.error(
					"Recipe deleted, but image cleanup failed:",
					storageError
				);
			}
		}
	}

	window.location.href = "index.html";
}


function getRecipeImagePath(imageUrl) {
	try {
		const url = new URL(imageUrl);

		const marker = "/storage/v1/object/public/recipe-images/";

		const index = url.pathname.indexOf(marker);

		if (index === -1) {
			return null;
		}

		return decodeURIComponent(
			url.pathname.substring(index + marker.length)
		);

	} catch (error) {
		console.error("Unable to determine recipe image path:", error);
		return null;
	}
}

function displayRecipeError(title, message) {
	const container = document.getElementById("recipe-detail");

	if (!container) {
		return;
	}

	container.innerHTML = `
    <div class="recipe-error">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
        <a href="index.html" class="button">
            Return to recipes
        </a>
    </div>
`;
}

function formatIngredient(ingredient) {
	if (typeof ingredient === "string") {
		return escapeHtml(ingredient);
	}

	if (!ingredient || typeof ingredient !== "object") {
		return "";
	}

	const quantity = ingredient.quantity || "";
	const unit = ingredient.unit || "";
	const name = ingredient.name || ingredient.ingredient || "";

	const parts = [
		quantity,
		unit,
		name
	].filter(Boolean);

	return escapeHtml(parts.join(" "));
}

function formatInstructions(instructions) {
	if (!instructions) {
		return `
        <p class="recipe-placeholder">
            No instructions have been added yet.
        </p>
    `;
	}

	const text = String(instructions);
	const paragraphs = text.split(/\n\s*\n/);

	return paragraphs.map(paragraph => `
    <p>
        ${escapeHtml(paragraph).replace(/\n/g, "<br>")}
    </p>
`).join("");
}

function formatMultilineText(text) {
	return escapeHtml(String(text))
		.replace(/\n\s*\n/g, "</p><p>")
		.replace(/\n/g, "<br>");
}

function escapeHtml(value) {
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
