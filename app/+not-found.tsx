import React from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import { Stack, router } from "expo-router";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex justify-center px-4 pt-8 pb-4 md:pt-10 md:pb-8 md:rounded-sm md:px-[140px] bg-background-0 flex-1 items-center">

          <Heading className="mt-10 text-2xl text-center text-typography-100 ">
            Oops! Page not found
          </Heading>
          <Text className="text-sm mt-2 mb-8 text-center max-w-72 md:max-w-[372px]">
            The page you are looking for might have been removed, had it's name
            changed, or is temporary unavailable
          </Text>
          <TouchableOpacity onPress={() => router.replace("/")} className="mt-4 py-4">
            <Text className="text-sm text-primary-700 group-hover/link:text-primary-800 group-active/link:text-primary-900 underline">
              Go to home screen!
            </Text>
          </TouchableOpacity>
        </Box>
      </ScrollView>
    </>
  );
}
