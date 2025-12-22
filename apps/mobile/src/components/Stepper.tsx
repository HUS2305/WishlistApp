import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "./Text";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  onStepPress?: (step: number) => void;
  allowNavigation?: boolean;
}

export function Stepper({
  currentStep,
  totalSteps,
  steps,
  onStepPress,
  allowNavigation = false,
}: StepperProps) {
  const { theme } = useTheme();

  const getStepStatus = (step: number) => {
    if (step < currentStep) return "completed";
    if (step === currentStep) return "current";
    return "upcoming";
  };

  const handleStepPress = (step: number) => {
    if (allowNavigation && onStepPress && step <= currentStep) {
      onStepPress(step);
    }
  };

  return (
    <View style={styles.container}>
      {steps.map((stepLabel, index) => {
        const stepNumber = index + 1;
        const status = getStepStatus(stepNumber);
        const isCompleted = status === "completed";
        const isCurrent = status === "current";

        return (
          <View key={index} style={styles.stepContainer}>
            <View style={styles.stepContent}>
              {/* Step Number/Checkmark */}
              <TouchableOpacity
                onPress={() => handleStepPress(stepNumber)}
                disabled={!allowNavigation || stepNumber > currentStep}
                style={styles.stepIndicator}
              >
                {isCompleted ? (
                  <Feather
                    name="check"
                    size={18}
                    color={theme.colors.primary}
                  />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color: isCurrent
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                        fontWeight: isCurrent ? "700" : "500",
                      },
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Step Label */}
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCurrent
                      ? theme.colors.primary
                      : isCompleted
                      ? theme.colors.textPrimary
                      : theme.colors.textSecondary,
                    fontWeight: isCurrent ? "600" : "400",
                  },
                ]}
              >
                {stepLabel}
              </Text>
            </View>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      stepNumber < currentStep
                        ? theme.colors.primary
                        : theme.colors.textSecondary + "30",
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flex: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  stepContent: {
    alignItems: "center",
    zIndex: 1,
  },
  stepIndicator: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    minHeight: 24,
    minWidth: 24,
  },
  stepNumber: {
    fontSize: 18,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 80,
  },
  connector: {
    position: "absolute",
    top: 12,
    left: "60%",
    width: "80%",
    height: 2,
    zIndex: 0,
  },
});

