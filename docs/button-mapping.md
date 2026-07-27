# Button Mapping

Esete documento explica como fazer a escrita e leitura do mapeamento dos botões.

The firmware exposes 18 button configuration slots. Each slot occupies 3 bytes and stores the action assigned to one
button. The association between physical buttons and slots is model-dependent and, on some devices, the read operation
may return the slots in a different order than they were written.

Gosto de chamar o primeiro byte de um slot de `Firmware Action` porque ele indica o que exatamente aquela tecla faz, o
signficado do segundo e terceiro byte depende do `Firmware Action`, mas gosto de chamar eles de `Modifiers`
e `Usage Id` respectivamente.

O motivo desses nomes é que normalmente voce só vai usar o primeiro byte, voce só usa o segundo quando precisa de
informaçõa extra, como por exemplo essa simples macro: `0x11, 0x01, 0x06`, o primeiro byte `0x11` diz que é uma macro
simples de teclado, o segundo diz os modifiers, e o terceiro diz o usage id, logo seguindo a tabela de usage id dos
teclados, isso é uma macro que faz `Ctrl + c`.

Porem como falei, existe as `Firmware Action` que já fazem bastante coisa por si só, sem precisar de nenhum modificador
ou usage id, como por exemplo no exemplo do `0x07` que é uma `Firmware Action` de double click que usa apenas o primeiro
byte e deixa os outros campos em branco (`0x00`).

## Write

| Offset | Example            | Description      |
|--------|--------------------|------------------|
| 0      | `0x08`             | Report Id        |
| 1      | `0x3b`             | Packet Length    |
| 2      | `0x01`             | Profile Id       |
| 3-5    | `0x02, 0x00, 0x00` | Slot 1           |
| 6-8    | `0x03, 0x00, 0x00` | Slot 2           |
| 9-11   | `0x04, 0x00, 0x00` | Slot 3           |
| 12-14  | `0x01, 0x00, 0x00` | Slot 4           |
| 15-17  | `0x01, 0x00, 0x00` | Slot 5           |
| 18-20  | `0x0d, 0x00, 0x00` | Slot 6           |
| 21-23  | `0x06, 0x00, 0x00` | Slot 7           |
| 24-26  | `0x01, 0x00, 0x00` | Slot 8           |
| 27-29  | `0x01, 0x00, 0x00` | Slot 9           |
| 30-32  | `0x01, 0x00, 0x00` | Slot 10          |
| 33-35  | `0x01, 0x00, 0x00` | Slot 11          |
| 36-38  | `0x01, 0x00, 0x00` | Slot 12          |
| 39-40  | `0x01, 0x00, 0x00` | Slot 13          |
| 42-44  | `0x01, 0x00, 0x00` | Slot 14          |
| 45-47  | `0x01, 0x00, 0x00` | Slot 15          |
| 48-50  | `0x01, 0x00, 0x00` | Slot 16          |
| 51-53  | `0x09, 0x00, 0x00` | Slot 17          |
| 54-57  | `0x0a, 0x00, 0x00` | Slot 18          |
| 58-60  | `0x00, 0x3e`       | Checksum 16 bits |

- Slot 5 tem seu uso desencorajado, pois pelo menos enquanto fazia testes usando o Attack Shark X11, notei que qualquer
  valor escrito aqui vai para o limbo, nada é de fato gravado no slot 5.
- Slot 7 não pode ser desabilitado, caso tente desabilitar ele com `0x01` ele apenas retona para o valor default `0x3c`

Para saber mais sobre os valores de firmware action e usage id, recomendo buscar diretamente no codigo fonte, e sobre
macros customizadas (report id `0x08`) existe um documento propio para isso.

## Read

| Offset | Example            | Description      |
|--------|--------------------|------------------|
| 0      | `0x08`             | Report Id        |
| 1      | `0x3b`             | Packet Length    |
| 2      | `0x01`             | Profile Id       |
| 3-5    | `0x02, 0x00, 0x00` | Slot 1           |
| 6-8    | `0x03, 0x00, 0x00` | Slot 2           |
| 9-11   | `0x04, 0x00, 0x00` | Slot 3           |
| 12-14  | `0x01, 0x00, 0x00` | Slot 4           |
| 15-17  | `0x06, 0x00, 0x00` | Slot 5           |
| 18-20  | `0x05, 0x00, 0x00` | Slot 8           |
| 21-23  | `0x3c, 0x00, 0x00` | Slot 5           |
| 24-26  | `0x0d, 0x00, 0x00` | Slot 6           |
| 27-29  | `0x01, 0x00, 0x00` | Slot 9           |
| 30-32  | `0x01, 0x00, 0x00` | Slot 10          |
| 33-35  | `0x01, 0x00, 0x00` | Slot 11          |
| 36-38  | `0x01, 0x00, 0x00` | Slot 12          |
| 39-40  | `0x01, 0x00, 0x00` | Slot 13          |
| 42-44  | `0x01, 0x00, 0x00` | Slot 14          |
| 45-47  | `0x01, 0x00, 0x00` | Slot 15          |
| 48-50  | `0x01, 0x00, 0x00` | Slot 16          |
| 51-53  | `0x0a, 0x00, 0x00` | Slot 18          |
| 54-57  | `0x09, 0x00, 0x00` | Slot 17          |
| 58-60  | `0x00, 0x79`       | Checksum 16 bits |

### Example

Aqui está 2 buffer o primeiro é um exemplo de escrita, onde ele mapeia todos os slots para o valor default do Attack
Shark X11, e o segundo é um exemplo de leitura desses valores defaults.

````text
083b01 020000 030000 040000 010000 010000 0d000 0060000 050000 010000 010000 010000 010000 010000 010000 010000 010000 090000 0a0000 003e
083b01 020000 030000 040000 010000 060000 05000 03c0000 0d0000 010000 010000 010000 010000 010000 010000 010000 010000 0a0000 090000 0079
````
