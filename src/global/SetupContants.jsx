import { fetchRoles } from "../services/api/Api";
import { constants } from "./constants";

export const initializeConstants = async () => {
  try {
    const rolesData = await fetchRoles();

    if (Array.isArray(rolesData)) {
      // Build a new roles object from the API data
      const dynamicRoles = {};
      rolesData.forEach(role => {
        if (role?.name) {
          dynamicRoles[role.name.toLowerCase().replace(/\s+/g, '')] = role.name;
        }
      });

      // Mutate the existing constants.roles
      constants.roles = dynamicRoles;
    }
  } catch (err) {
    console.error("Failed to initialize roles in constants:", err);
  }
};