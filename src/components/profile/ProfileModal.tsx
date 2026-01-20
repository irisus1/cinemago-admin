import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProfileInfo from "./ProfileInfo";
import ProfilePassword from "./ProfilePassword";
import { IoSettingsOutline } from "react-icons/io5";

export default function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-hidden p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-6 pt-5">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <IoSettingsOutline className="w-5 h-5" />
            Cài đặt tài khoản
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <div className="w-full">
            <TabsList className="flex w-full max-w-md mx-auto rounded-xl bg-white shadow-sm">
              <TabsTrigger
                value="info"
                className="flex-1 rounded-lg px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Thông tin cá nhân
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="flex-1 rounded-lg px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Đổi mật khẩu
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info">
            <ProfileInfo onClose={onClose} />
          </TabsContent>

          <TabsContent value="password">
            <ProfilePassword onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
