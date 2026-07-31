import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex flex-1 items-center justify-center bg-background-0 px-4 pb-4 pt-8 md:rounded-sm md:px-[140px] md:pb-8 md:pt-10">
          <Heading className="mt-10 text-center text-2xl text-typography-100 ">
            Oops! Page not found
          </Heading>
          <Text className="mb-8 mt-2 max-w-72 text-center text-sm md:max-w-[372px]">
            The page you are looking for might have been removed, had it's name changed, or is
            temporary unavailable
          </Text>
          <TouchableOpacity onPress={() => router.replace('/')} className="mt-4 py-4">
            <Text className="text-sm text-primary-700 underline group-hover/link:text-primary-800 group-active/link:text-primary-900">
              Go to home screen!
            </Text>
          </TouchableOpacity>
        </Box>
      </ScrollView>
    </>
  );
}
