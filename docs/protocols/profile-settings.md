# Profile Settings

Este documento explica como ler e gravar a configuração de profiles do device.

## Overview

Este protocolo permite dizer quantos profiles existem no device e ainda permite alterar entre eles.

Assim como outros comandos, esse Report Id precisa especificar em qual profile ele irá ser gravado, isso pode parecer um
pouco confuso, pois o mesmo comando pode ser usado para ler e gravar a configuração de profiles, sendo sincero eu também
não entendo o porque disso pois isso pode causar alguns comportamentos bem estranhos devido ao comando de mapeamento de
botões,onde existe uma macro que permite altenar entre os profiles.

## Writing Profile Settings

| Offset | Description      | Default Example |
|--------|------------------|-----------------|
| 0      | Report ID        | `0x0c`          |
| 1      | Packet Length    | `0x0a`          |
| 2      | Fixed Profile Id | `0x01`          |
| 3      | Current Profile  | `0x01`          |
| 4      | (~byte3 & 0xff)  | `0xfe`          |
| 5      | Max Profiles     | `0x01`          |
| 6      | (~byte5 & 0xff)  | `0xfe`          |
| 7      | Padding          | `0x00`          |
| 8      | Padding          | `0x00`          |
| 9      | Padding          | `0x00`          |

Quando em modo Wired, o padding não é enviado.

## Reading Profile Settings

| Offset | Description     | Default Example |
|--------|-----------------|-----------------|
| 0      | Report ID       | `0x0c`          |
| 1      | Packet Length   | `0x0a`          |
| 2      | Current Profile | `0x01`          |
| 3      | (~byte3 & 0xff) | `0xfe`          |
| 4      | Max Profiles    | `0x01`          |
| 5      | (~byte5 & 0xff) | `0xfe`          |
| 6      | Padding         | `0x00`          |
| 7      | Padding         | `0x00`          |
| 8      | Padding         | `0x00`          |
| 9      | Padding         | `0x00`          |

Na leitura ele não reporta em qual profile ele foi gravado
