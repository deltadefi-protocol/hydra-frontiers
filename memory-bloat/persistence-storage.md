kubectl -n hydra-docker exec deployment/alpine -- sh -c 'ls -alh /persistence*/per*'
/persistence-alice/persistence-alice:
total 6G
drwxr-xr-x    5 root     root        4.0K Jan  2 07:49 .
drwxr-xr-x    3 root     root        4.0K Dec 31 08:45 ..
drwxr-xr-x    2 root     root        4.0K Dec 31 08:45 bin
drwx------    3 root     root        4.0K Dec 31 08:45 etcd
-rw-r--r--    1 root     root           4 Jan  2 07:50 last-known-revision
drwxr-xr-x    2 root     root        4.0K Jan  2 07:50 pending-broadcast
-rw-r--r--    1 root     root      606.9M Jan  2 07:55 state
-rw-r--r--    1 root     root      881.1M Jan  2 06:30 state-16000
-rw-r--r--    1 root     root        1.1G Jan  2 06:31 state-16500
-rw-r--r--    1 root     root      808.7M Jan  2 07:46 state-17000
-rw-r--r--    1 root     root        1.0G Jan  2 07:47 state-17500
-rw-r--r--    1 root     root     1022.6M Jan  2 07:48 state-18000
-rw-r--r--    1 root     root      980.4M Jan  2 07:49 state-18500

/persistence-bob/persistence-bob:
total 6G
drwxr-xr-x    5 root     root        4.0K Jan  2 07:49 .
drwxr-xr-x    3 root     root        4.0K Dec 31 08:45 ..
drwxr-xr-x    2 root     root        4.0K Dec 31 08:45 bin
drwx------    3 root     root        4.0K Dec 31 08:45 etcd
-rw-r--r--    1 root     root           4 Jan  2 07:50 last-known-revision
drwxr-xr-x    2 root     root        4.0K Jan  2 07:49 pending-broadcast
-rw-r--r--    1 root     root      604.0M Jan  2 07:55 state
-rw-r--r--    1 root     root      881.4M Jan  2 06:30 state-16000
-rw-r--r--    1 root     root        1.1G Jan  2 06:31 state-16500
-rw-r--r--    1 root     root      808.7M Jan  2 07:46 state-17000
-rw-r--r--    1 root     root        1.0G Jan  2 07:47 state-17500
-rw-r--r--    1 root     root     1017.5M Jan  2 07:48 state-18000
-rw-r--r--    1 root     root      983.3M Jan  2 07:49 state-18500

/persistence-charlie/persistence-charlie:
total 6G
drwxr-xr-x    5 root     root        4.0K Jan  2 07:48 .
drwxr-xr-x    3 root     root        4.0K Dec 31 08:45 ..
drwxr-xr-x    2 root     root        4.0K Dec 31 08:45 bin
drwx------    3 root     root        4.0K Dec 31 08:45 etcd
-rw-r--r--    1 root     root           4 Jan  2 07:49 last-known-revision
drwxr-xr-x    2 root     root        4.0K Jan  2 07:49 pending-broadcast
-rw-r--r--    1 root     root      957.5M Jan  2 07:49 state
-rw-r--r--    1 root     root      881.4M Jan  2 06:30 state-16000
-rw-r--r--    1 root     root        1.1G Jan  2 06:31 state-16500
-rw-r--r--    1 root     root      808.7M Jan  2 07:46 state-17000
-rw-r--r--    1 root     root        1.0G Jan  2 07:47 state-17500
-rw-r--r--    1 root     root     1020.2M Jan  2 07:48 state-18000

/persistence-david/persistence-david:
total 6G
drwxr-xr-x    5 root     root        4.0K Jan  2 07:49 .
drwxr-xr-x    3 root     root        4.0K Dec 31 08:45 ..
drwxr-xr-x    2 root     root        4.0K Dec 31 08:45 bin
drwx------    3 root     root        4.0K Dec 31 08:45 etcd
-rw-r--r--    1 root     root           4 Jan  2 07:50 last-known-revision
drwxr-xr-x    2 root     root        4.0K Jan  2 07:49 pending-broadcast
-rw-r--r--    1 root     root      604.0M Jan  2 07:55 state
-rw-r--r--    1 root     root      883.9M Jan  2 06:30 state-16000
-rw-r--r--    1 root     root        1.1G Jan  2 06:31 state-16500
-rw-r--r--    1 root     root      806.2M Jan  2 07:46 state-17000
-rw-r--r--    1 root     root        1.0G Jan  2 07:47 state-17500
-rw-r--r--    1 root     root     1020.2M Jan  2 07:48 state-18000
-rw-r--r--    1 root     root      980.6M Jan  2 07:49 state-18500