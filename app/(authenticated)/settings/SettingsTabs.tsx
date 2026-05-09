"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProfileForm from "./ProfileForm"
import TagManager from "./TagManager"
import AliasManager from "./AliasManager"
import RuleManager from "./RuleManager"

export default function SettingsTabs() {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
        <TabsTrigger value="aliases">Merchant Aliases</TabsTrigger>
        <TabsTrigger value="rules">Import Rules</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-6">
        <ProfileForm />
      </TabsContent>
      <TabsContent value="tags" className="mt-6">
        <TagManager />
      </TabsContent>
      <TabsContent value="aliases" className="mt-6">
        <AliasManager />
      </TabsContent>
      <TabsContent value="rules" className="mt-6">
        <RuleManager />
      </TabsContent>
    </Tabs>
  )
}
