# Launch Program

> To better understand this document, read the `README.md` located in the root of this directory first.

Esse evento é enviado quando um botão que foi assinado com a o firmware action `0x13` (`LAUNCH_PROGRAM`) é pressionado
ou liberado.

A maior utilidade desse evento é para iniciar programas, porem o evento em si é bem limitado pois ele apenas indica qual
botão foi pressionado, o jeito de implementar isso seria através de um mapeamento de botões para programas.

Assim no seu programa você fica ouvindo esse evento e quando ele for acionado voce verifica qual era o programa que o
usuario tinha mapeado ai então voce abre o programa em questão.

## Structure

| Event Code | Param 1      | Param 2      |
|------------|--------------|--------------|
| `0x30`     | Button Index | Button State |

### Event Code

Fixed value `0x30`.

### Param 1

Qual o botão que está sendo pressionado.

### Param 2

O estado do botão.

| Value  | Description |
|--------|-------------|
| `0x00` | Pressed     |
| `0x01` | Release     |

## Example

```text
03 00 30 06 01
│  │  │  │  └── Button State: Pressed
│  │  │  └───── Button Index: Backward
│  │  └──────── Event Code: 0x13
│  └─────────── Fixed
└────────────── Report ID
```

## Notes

Ao contrario dos outros eventos, note que esse não indica qual é o Device ID.
