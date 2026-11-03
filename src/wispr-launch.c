/* Launch the original app as its own TCC-responsible process.
   No permissions are granted or altered; official signature remains intact.
   Technique also used by Chromium/LLDB's macOS process launcher. */
#include <spawn.h>
#include <dlfcn.h>
#include <stdio.h>
#include <fcntl.h>
#include <string.h>
#include <unistd.h>
extern char **environ;
int main(void) {
  const char *app="/Applications/Wispr Flow.app/Contents/MacOS/Wispr Flow";
  typedef int (*disclaim_fn)(posix_spawnattr_t *, int);
  disclaim_fn disclaim=(disclaim_fn)dlsym(RTLD_DEFAULT,"responsibility_spawnattrs_setdisclaim");
  if (!disclaim) { fputs("macOS responsibility API unavailable\n",stderr); return 72; }
  posix_spawnattr_t attrs;
  int result=posix_spawnattr_init(&attrs);
  if (!result) result=posix_spawnattr_setflags(&attrs,POSIX_SPAWN_SETEXEC);
  if (!result) result=disclaim(&attrs,1);
  if (result) { fprintf(stderr,"Spawn attributes failed: %s\n",strerror(result)); return 73; }
  for(int fd=3;fd<=4;fd++){
    int flags=fcntl(fd,F_GETFD);
    if(flags<0||fcntl(fd,F_SETFD,flags & ~FD_CLOEXEC)<0)return 74;
  }
  char *args[]={(char*)app,"--remote-debugging-pipe",NULL};
  result=posix_spawn(NULL,app,NULL,&attrs,args,environ);
  fprintf(stderr,"App launch failed: %s\n",strerror(result));
  posix_spawnattr_destroy(&attrs);
  return 75;
}
