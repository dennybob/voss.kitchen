let currentAdminUserId = null;

document.addEventListener("DOMContentLoaded", async () => {
  setCurrentYear();

  const profile = await getCurrentProfile();

  // Not logged in
  if (!profile.is_admin || !profile.active) {
    window.location.href = "login.html";
    return;
  }

  // Logged in but not an administrator
  if (!profile.is_admin) {
    window.location.href = "index.html";
    return;
  }

  // Administrator confirmed
const currentUser = await getCurrentUser();
currentAdminUserId = currentUser ? currentUser.id : null;

  displayAdminWelcome(profile);

  await Promise.all([
    loadUsers(),
    loadAdminRecipes()
  ]);
});


function displayAdminWelcome(profile) {
  const welcome = document.getElementById("admin-welcome");

  if (!welcome) return;

  const name = profile.display_name || "Administrator";

  welcome.textContent = `Welcome, ${name}.`;
}


async function loadUsers() {
  const loading = document.getElementById("users-loading");
  const container = document.getElementById("users-container");

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, display_name, approved, is_admin, active, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading users:", error);
      loading.textContent = "Unable to load users.";
      return;
    }

    loading.style.display = "none";

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          No users found.
        </div>
      `;
      return;
    }

    displayUsers(data);

  } catch (error) {
    console.error("Unexpected error loading users:", error);
    loading.textContent = "Unable to load users.";
  }
}


function displayUsers(users) {
  const container = document.getElementById("users-container");

  container.innerHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Approved</th>
            <th>Administrator</th>
			<th>Active</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${users.map(user => `
            <tr data-user-id="${escapeHtml(user.id)}">

              <td>
                <strong>${escapeHtml(user.display_name || "Unnamed user")}</strong>
              </td>

              <td>
                <span class="status-badge ${user.approved ? "status-approved" : "status-pending"}">
                  ${user.approved ? "Approved" : "Pending"}
                </span>
              </td>

              <td>
                <span class="status-badge ${user.is_admin ? "status-admin" : "status-user"}">
                  ${user.is_admin ? "Admin" : "User"}
                </span>
              </td>

              <td>
                <span class="status-badge ${user.active ? "status-approved" : "status-pending"}">
                  ${user.active ? "Active" : "Inactive"}
                </span>
              </td>

              <td>
                ${formatAdminDate(user.created_at)}
              </td>

              <td>
                <div class="admin-actions">

					<button
						type="button"
						class="admin-button"
						onclick="toggleUserApproval('${user.id}', ${user.approved})"
					>
						${user.approved ? "Unapprove" : "Approve"}
					</button>

					<button
						type="button"
						class="admin-button"
						onclick="toggleUserAdmin('${user.id}', ${user.is_admin})"
					>
						${user.is_admin ? "Remove Admin" : "Make Admin"}
					</button>

					${user.id === currentAdminUserId
  						? `<span class="admin-action-note">Current account</span>`
  						: `
    						<button
      							ype="button"
      							class="admin-button"
      							onclick="toggleUserActive('${user.id}', ${user.active})"
    						>
      							${user.active ? "Deactivate" : "Reactivate"}
    						</button>
 						`
					}

				</div>
              </td>

            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


async function toggleUserApproval(userId, currentValue) {
  const newValue = !currentValue;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      approved: newValue
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating approval:", error);
    alert("Unable to update user approval.");
    return;
  }

  await loadUsers();
}


async function toggleUserAdmin(userId, currentValue) {
  const newValue = !currentValue;

  if (newValue) {
    const confirmed = confirm(
      "Make this user an administrator?\n\nAdministrators can approve users and modify or delete any recipe."
    );

    if (!confirmed) return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      is_admin: newValue
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating administrator status:", error);
    alert("Unable to update administrator status.");
    return;
  }

  await loadUsers();
}


async function toggleUserActive(userId, currentValue) {
  const newValue = !currentValue;

  if (!newValue) {
    const confirmed = confirm(
      "Deactivate this user?\n\nThey will no longer be able to log in or modify recipes."
    );

    if (!confirmed) return;
  }

  const { error } = await supabaseClient.rpc(
    "set_user_active",
    {
      target_user_id: userId,
      new_active: newValue
    }
  );

  if (error) {
    console.error("Error updating active status:", error);
    alert("Unable to update user active status.");
    return;
  }

  await loadUsers();
}


async function loadAdminRecipes() {
  const loading = document.getElementById("admin-recipes-loading");
  const container = document.getElementById("admin-recipes-container");

  try {
    const { data, error } = await supabaseClient
      .from("recipes")
      .select("id, title, category, created_by, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading admin recipes:", error);
      loading.textContent = "Unable to load recipes.";
      return;
    }

    loading.style.display = "none";

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="admin-empty">
          No recipes found.
        </div>
      `;
      return;
    }

    displayAdminRecipes(data);

  } catch (error) {
    console.error("Unexpected error loading recipes:", error);
    loading.textContent = "Unable to load recipes.";
  }
}


function displayAdminRecipes(recipes) {
  const container = document.getElementById("admin-recipes-container");

  container.innerHTML = `
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Category</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${recipes.map(recipe => `
            <tr data-recipe-id="${escapeHtml(recipe.id)}">

              <td>
                <strong>${escapeHtml(recipe.title)}</strong>
              </td>

              <td>
                ${escapeHtml(recipe.category || "—")}
              </td>

              <td>
                ${formatAdminDate(recipe.created_at)}
              </td>

              <td>
                <div class="admin-actions">

                  <a
                    href="recipe.html?id=${encodeURIComponent(recipe.id)}"
                    class="admin-button"
                  >
                    View
                  </a>

                  <button
                    type="button"
                    class="admin-button"
                    onclick="deleteAdminRecipe('${recipe.id}', '${escapeHtml(recipe.title)}')"
                  >
                    Delete
                  </button>

                </div>
              </td>

            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


async function deleteAdminRecipe(recipeId, recipeTitle) {
  const confirmed = confirm(
    `Delete "${recipeTitle}"?\n\nThis cannot be undone.`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("recipes")
    .delete()
    .eq("id", recipeId);

  if (error) {
    console.error("Error deleting recipe:", error);
    alert("Unable to delete recipe.");
    return;
  }

  await loadAdminRecipes();
}


function formatAdminDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
