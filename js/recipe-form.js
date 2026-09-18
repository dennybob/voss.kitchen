let currentUser = null;
let currentProfile = null;
let editingRecipe = null;

const isEditPage = window.location.pathname.endsWith("edit-recipe.html");

document.addEventListener("DOMContentLoaded", async () => {
  setCurrentYear();

  currentUser = await getCurrentUser();
  currentProfile = await getCurrentProfile();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (!currentProfile || !currentProfile.approved) {
    window.location.href = "index.html";
    return;
  }

  if (isEditPage) {
    await initializeEditForm();
  } else {
    initializeAddForm();
  }
});


function initializeAddForm() {
  const form = document.getElementById("recipe-form");
  const addIngredientButton = document.getElementById("add-ingredient");
  const imageInput = document.getElementById("recipe-image");

  if (!form) return;

  addIngredient();

  addIngredientButton.addEventListener("click", () => {
    addIngredient();
  });

  imageInput.addEventListener("change", handleImagePreview);

  form.addEventListener("submit", handleRecipeSubmit);
}


async function initializeEditForm() {
  const recipeId = new URLSearchParams(window.location.search).get("id");

  if (!recipeId) {
    showRecipeFormMessage("No recipe was specified.", "error");
    return;
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (error || !data) {
    console.error("Error loading recipe for editing:", error);
    showRecipeFormMessage("Unable to load this recipe.", "error");
    return;
  }

  editingRecipe = data;

  // Normal users may edit only their own recipes.
  if (
    !currentProfile.is_admin &&
    data.created_by !== currentUser.id
  ) {
    window.location.href = `recipe.html?id=${encodeURIComponent(recipeId)}`;
    return;
  }

  populateRecipeForm(data);

  const form = document.getElementById("recipe-form");
  const addIngredientButton = document.getElementById("add-ingredient");
  const imageInput = document.getElementById("recipe-image");

  addIngredientButton.addEventListener("click", () => {
    addIngredient();
  });

  imageInput.addEventListener("change", handleImagePreview);

  form.addEventListener("submit", handleRecipeSubmit);
}


function populateRecipeForm(recipe) {
  document.getElementById("recipe-title").value = recipe.title || "";
  document.getElementById("recipe-description").value = recipe.description || "";
  document.getElementById("recipe-category").value = recipe.category || "";
  document.getElementById("recipe-servings").value = recipe.servings ?? "";
  document.getElementById("recipe-prep-time").value = recipe.prep_time ?? "";
  document.getElementById("recipe-cook-time").value = recipe.cook_time ?? "";
  document.getElementById("recipe-instructions").value = recipe.instructions || "";
  document.getElementById("recipe-notes").value = recipe.notes || "";

  const ingredientsList = document.getElementById("ingredients-list");
  ingredientsList.innerHTML = "";

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
    : [];

  if (ingredients.length === 0) {
    addIngredient();
  } else {
    ingredients.forEach((ingredient) => {
      addIngredient(ingredient);
    });
  }

  if (recipe.image_url) {
    const preview = document.getElementById("image-preview");
    const container = document.getElementById("image-preview-container");

    preview.src = recipe.image_url;
    container.classList.add("visible");
  }
}


function addIngredient(value = "") {
  const list = document.getElementById("ingredients-list");

  const row = document.createElement("div");
  row.className = "ingredient-row";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ingredient-input";
  input.placeholder = "e.g. 2 cups all-purpose flour";
  input.value = value;
  input.maxLength = 500;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-ingredient";
  removeButton.textContent = "−";
  removeButton.setAttribute("aria-label", "Remove ingredient");

  removeButton.addEventListener("click", () => {
    row.remove();

    const remaining = list.querySelectorAll(".ingredient-row");

    if (remaining.length === 0) {
      addIngredient();
    }
  });

  row.appendChild(input);
  row.appendChild(removeButton);

  list.appendChild(row);
}


function handleImagePreview(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("image-preview");
  const container = document.getElementById("image-preview-container");

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showRecipeFormMessage("Please select an image file.", "error");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    preview.src = reader.result;
    container.classList.add("visible");
  };

  reader.readAsDataURL(file);
}


async function handleRecipeSubmit(event) {
	event.preventDefault();

	clearRecipeFormMessage();

	const saveButton = document.getElementById("save-recipe");

	saveButton.disabled = true;
	saveButton.textContent = isEditPage ? "Saving Changes..." : "Saving...";

	let newImageUrl = null;

	try {
		const formData = collectRecipeFormData();

		validateRecipeFormData(formData);

		const imageFile = document.getElementById("recipe-image").files[0];

		/*
		 * Keep track of the existing image so we can remove it
		 * only after a successful database update.
		 */
		const oldImageUrl = editingRecipe?.image_url || null;

		let imageUrl = oldImageUrl;

		/*
		 * Upload the replacement image first.
		 *
		 * We deliberately do not delete the old image yet.
		 */
		if (imageFile) {
			newImageUrl = await uploadRecipeImage(imageFile);
			imageUrl = newImageUrl;
		}

		const recipeData = {
			title: formData.title,
			description: formData.description,
			category: formData.category,
			servings: formData.servings,
			prep_time: formData.prep_time,
			cook_time: formData.cook_time,
			ingredients: formData.ingredients,
			instructions: formData.instructions,
			notes: formData.notes,
			image_url: imageUrl
		};

		let recipeId;

		if (isEditPage) {
			recipeId = editingRecipe.id;

			const { error } = await supabaseClient
				.from("recipes")
				.update(recipeData)
				.eq("id", recipeId);

			if (error) {
				console.error("Error updating recipe:", error);
				throw new Error("Unable to update the recipe.");
			}

			/*
			 * The database now points to the new image.
			 * It is safe to remove the old image.
			 */
			if (newImageUrl && oldImageUrl) {
				await deleteRecipeImage(oldImageUrl);
			}

		} else {
			const { data, error } = await supabaseClient
				.from("recipes")
				.insert({
					...recipeData,
					created_by: currentUser.id
				})
				.select("id")
				.single();

			if (error) {
				console.error("Error saving recipe:", error);
				throw new Error("Unable to save the recipe.");
			}

			recipeId = data.id;
		}

		/*
		 * Success.
		 */
		window.location.href =
			`recipe.html?id=${encodeURIComponent(recipeId)}`;

	} catch (error) {
		console.error("Recipe save error:", error);

		/*
		 * If we uploaded a new image but the database operation
		 * failed, remove the new image so it does not become orphaned.
		 */
		if (newImageUrl) {
			await deleteRecipeImage(newImageUrl);
		}

		showRecipeFormMessage(
			error.message || "Unable to save the recipe.",
			"error"
		);

		saveButton.disabled = false;
		saveButton.textContent = isEditPage
			? "Save Changes"
			: "Save Recipe";
	}
}


async function deleteRecipeImage(imageUrl) {
	const imagePath = getRecipeImagePath(imageUrl);

	if (!imagePath) {
		return;
	}

	const { error } = await supabaseClient
		.storage
		.from("recipe-images")
		.remove([imagePath]);

	if (error) {
		console.error(
			"Unable to delete recipe image from Storage:",
			error
		);
	}
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


function collectRecipeFormData() {
  const getValue = (id) => {
    const element = document.getElementById(id);
    return element.value.trim();
  };

  const numberOrNull = (id) => {
    const value = getValue(id);

    if (value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  const ingredientInputs = document.querySelectorAll(".ingredient-input");

  const ingredients = Array.from(ingredientInputs)
    .map(input => input.value.trim())
    .filter(value => value !== "");

  return {
    title: getValue("recipe-title"),
    description: getValue("recipe-description") || null,
    category: getValue("recipe-category") || null,
    servings: numberOrNull("recipe-servings"),
    prep_time: numberOrNull("recipe-prep-time"),
    cook_time: numberOrNull("recipe-cook-time"),
    ingredients,
    instructions: getValue("recipe-instructions"),
    notes: getValue("recipe-notes") || null
  };
}


function validateRecipeFormData(data) {
  if (!data.title) {
    throw new Error("Please enter a recipe title.");
  }

  if (!data.instructions) {
    throw new Error("Please enter the cooking instructions.");
  }

  if (data.ingredients.length === 0) {
    throw new Error("Please add at least one ingredient.");
  }

  if (
    data.servings !== null &&
    (!Number.isInteger(data.servings) || data.servings < 1)
  ) {
    throw new Error("Servings must be a whole number greater than zero.");
  }

  if (
    data.prep_time !== null &&
    (!Number.isInteger(data.prep_time) || data.prep_time < 0)
  ) {
    throw new Error("Prep time must be zero or greater.");
  }

  if (
    data.cook_time !== null &&
    (!Number.isInteger(data.cook_time) || data.cook_time < 0)
  ) {
    throw new Error("Cook time must be zero or greater.");
  }
}


async function uploadRecipeImage(file) {
  const fileExtension = getImageExtension(file);
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("recipe-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.error("Image upload error:", uploadError);
    throw new Error("Unable to upload the recipe image.");
  }

  const {
    data: publicUrlData
  } = supabaseClient
    .storage
    .from("recipe-images")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}


function getImageExtension(file) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      throw new Error("Please use a JPG, PNG, or WebP image.");
  }
}


function showRecipeFormMessage(message, type = "") {
  const element = document.getElementById("recipe-form-message");

  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;
}


function clearRecipeFormMessage() {
  const element = document.getElementById("recipe-form-message");

  if (!element) return;

  element.textContent = "";
  element.className = "auth-message";
}
