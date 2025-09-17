import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "../context/useAuth";
import Login from "../pages/Login";
import SuperAdminHome from "../pages/SuperAdminHome";
import AdminHome from "../pages/AdminHome";
import EmployeeHome from "../pages/EmployeeHome";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          
          <Stack.Screen name="Login" component={Login} />
        ) : (
          
          <>
            {user.rol === "superadmin" && (
              <Stack.Screen name="SuperAdmin" component={SuperAdminHome} />
            )}
            {user.rol === "admin" && (
              <Stack.Screen name="Admin" component={AdminHome} />
            )}
            {user.rol === "empleado" && (
              <Stack.Screen name="Empleado" component={EmployeeHome} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}